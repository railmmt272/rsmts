import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import LocationSelectModal from '../CommandCenter/LocationSelectModal';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

interface ShuntingProgramFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  programToEdit?: any;
}

const SHOP_OPTIONS = ['WAGON', 'LOCO', 'CRANE', 'MANUFACTURING'];

export default function ShuntingProgramFormModal({
  isOpen,
  onClose,
  onSuccess,
  programToEdit,
}: ShuntingProgramFormModalProps) {
  const [initialPosition, setInitialPosition] = useState('');
  const [finalPosition, setFinalPosition] = useState('');
  const [rsType, setRsType] = useState('');
  const [rsNo, setRsNo] = useState('');
  const [shop, setShop] = useState('');
  const [remark, setRemark] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [isInitialPositionModalOpen, setIsInitialPositionModalOpen] = useState(false);
  const [isFinalPositionModalOpen, setIsFinalPositionModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      if (programToEdit) {
        setInitialPosition(programToEdit.initialPosition);
        setFinalPosition(programToEdit.finalPosition || '');
        setRsType(programToEdit.rsType || '');
        setRsNo(programToEdit.rsNo || '');
        setRemark(programToEdit.remark);
        setShop(programToEdit.shop || '');
      } else {
        setInitialPosition('');
        setFinalPosition('');
        setRsType('');
        setRsNo('');
        setRemark('');
        setShop('');
      }
      fetchLocations();
      fetchAssetCategories();
    }
  }, [isOpen, programToEdit]);

  const fetchAssetCategories = async () => {
    try {
      const response = await api.get('/asset-categories');
      setAssetCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch asset categories:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations?isActive=true');
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialPosition || !remark || !shop || !rsType || !rsNo) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      if (programToEdit) {
        await api.patch(`/shunting-programs/${programToEdit._id}`, { initialPosition, finalPosition, rsType, rsNo, remark, shop });
        toast.success('Request updated successfully');
      } else {
        await api.post('/shunting-programs', { initialPosition, finalPosition, rsType, rsNo, remark, shop });
        toast.success('Request added successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-4 sm:p-0">
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5 sm:my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{programToEdit ? 'Edit Request' : 'Add New Request'}</h3>
            <p className="text-sm text-gray-500 mt-1">{programToEdit ? 'Update details of the request' : 'Create a movement task or request'}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 max-h-[70vh] overflow-y-auto">
          <form id="shunting-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Shop Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Shop</label>
              <select
                value={shop}
                onChange={(e) => {
                  setShop(e.target.value);
                  setRsType('');
                }}
                required
                className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white sm:text-sm"
              >
                <option value="" disabled>Select Shop...</option>
                {SHOP_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* RS Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">RS Type</label>
              <select
                value={rsType}
                onChange={(e) => setRsType(e.target.value)}
                required
                disabled={!shop}
                className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white sm:text-sm disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="" disabled>{shop ? 'Select RS Type...' : 'Select a Shop first'}</option>
                {assetCategories
                  .filter(cat => cat.level === 'PARENT' && (
                    (shop === 'WAGON' && cat.parentCode === 'WAGON') ||
                    (shop === 'LOCO' && cat.parentCode === 'LOCO') ||
                    (shop === 'CRANE' && (cat.parentCode === 'CRANE' || cat.parentCode === 'TOWER CAR')) ||
                    (shop === 'MANUFACTURING' && cat.parentCode === 'MANUFACTURING')
                  ))
                  .map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.name}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* RS No. Input */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">RS No.</label>
              <input
                type="text"
                value={rsNo}
                onChange={(e) => setRsNo(e.target.value)}
                required
                placeholder="Enter RS No."
                className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white sm:text-sm"
              />
            </div>

            {/* Initial Position Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Initial Position</label>
              <button
                type="button"
                onClick={() => setIsInitialPositionModalOpen(true)}
                className="flex items-center justify-between w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white hover:bg-gray-50 transition-colors sm:text-sm text-left"
              >
                <span className={initialPosition ? "text-gray-900 font-medium" : "text-gray-500"}>
                  {initialPosition ? `${locations.find(l => l.code === initialPosition)?.name || initialPosition}` : "Select Initial Position..."}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              <LocationSelectModal
                isOpen={isInitialPositionModalOpen}
                onClose={() => setIsInitialPositionModalOpen(false)}
                locations={locations}
                onSelect={setInitialPosition}
                title="Select Initial Position"
              />
            </div>

            {/* Final Position Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Final Position <span className="text-gray-400 font-normal">(Optional)</span></label>
              <button
                type="button"
                onClick={() => setIsFinalPositionModalOpen(true)}
                className="flex items-center justify-between w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white hover:bg-gray-50 transition-colors sm:text-sm text-left"
              >
                <span className={finalPosition ? "text-gray-900 font-medium" : "text-gray-500"}>
                  {finalPosition ? `${locations.find(l => l.code === finalPosition)?.name || finalPosition}` : "Select Final Position..."}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              <LocationSelectModal
                isOpen={isFinalPositionModalOpen}
                onClose={() => setIsFinalPositionModalOpen(false)}
                locations={locations}
                onSelect={setFinalPosition}
                title="Select Final Position"
              />
            </div>

            {/* Program Details */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Remarks</label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                rows={4}
                className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white sm:text-sm"
                placeholder="e.g. Place wagon no. 231xxx345 in WRS 2 shop"
                required
              />
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="shunting-form"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
