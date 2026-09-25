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

export default function ShuntingProgramFormModal({
  isOpen,
  onClose,
  onSuccess,
  programToEdit,
}: ShuntingProgramFormModalProps) {
  const [shop, setShop] = useState('');
  const [remark, setRemark] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen) {
      if (programToEdit) {
        setShop(programToEdit.shop);
        setRemark(programToEdit.remark);
      } else {
        setShop('');
        setRemark('');
      }
      fetchLocations();
    }
  }, [isOpen, programToEdit]);

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
    if (!shop || !remark) {
      toast.error('Please fill in both Shop and Shunting Program.');
      return;
    }

    setSubmitting(true);
    try {
      if (programToEdit) {
        await api.patch(`/shunting-programs/${programToEdit._id}`, { shop, remark });
        toast.success('Shunting program updated successfully');
      } else {
        await api.post('/shunting-programs', { shop, remark });
        toast.success('Shunting program added successfully');
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save shunting program');
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
            <h3 className="text-lg font-semibold text-gray-900">{programToEdit ? 'Edit Shunting Program' : 'Add New Shunting Program'}</h3>
            <p className="text-sm text-gray-500 mt-1">{programToEdit ? 'Update details of the shunting task' : 'Create a movement task or shunting program'}</p>
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
              <label className="block text-sm font-medium text-gray-900 mb-2">Shop (Origin)</label>
              <button
                type="button"
                onClick={() => setIsShopModalOpen(true)}
                className="flex items-center justify-between w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white hover:bg-gray-50 transition-colors sm:text-sm text-left"
              >
                <span className={shop ? "text-gray-900 font-medium" : "text-gray-500"}>
                  {shop ? `${locations.find(l => l.code === shop)?.name || shop} (${shop})` : "Select Shop Location..."}
                </span>
                <ChevronDown className="w-5 h-5 text-gray-500" />
              </button>
              <LocationSelectModal
                isOpen={isShopModalOpen}
                onClose={() => setIsShopModalOpen(false)}
                locations={locations}
                onSelect={setShop}
                title="Select Shop"
              />
            </div>

            {/* Program Details */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Shunting Program</label>
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
              'Save Program'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
