import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import LocationSelectModal from '../CommandCenter/LocationSelectModal';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

export interface Asset {
  assetNumber: string;
  categoryCode: string;
  status: string;
  currentLocationCode: string;
  currentPipeline: string;
  remark: string;
  isActive: boolean;
}

interface AssetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assetToEdit?: Asset | null; // If present, it's Edit mode (Change Status)
}

interface IdentificationRule {
  type: 'NUMERIC' | 'ALPHANUMERIC';
  length: number;
  checkDigit: boolean;
}

interface AssetCategory {
  code: string;
  name: string;
  type: string;
  parentCode?: string;
  identificationRule?: IdentificationRule;
  children: AssetCategory[];
}

interface Location {
  code: string;
  name: string;
  isActive: boolean;
}

export default function AssetFormModal({ isOpen, onClose, onSuccess, assetToEdit }: AssetFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const { user } = useAuth();

  // Form Fields
  const [operation, setOperation] = useState('REPAIRING');
  const [assetNumber, setAssetNumber] = useState('');
  const [remark, setRemark] = useState('');
  
  // Category Selection
  const [categoryHierarchy, setCategoryHierarchy] = useState<AssetCategory[]>([]);
  const [selectedGrandparent, setSelectedGrandparent] = useState<string>('');
  const [selectedParent, setSelectedParent] = useState<string>('');
  const [selectedChild, setSelectedChild] = useState<string>('');

  // Location Selection
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  
  // Edit mode Status
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (assetToEdit) {
        // Edit Mode
        setStatus(assetToEdit.status);
        setRemark(''); // Clear remark for new entry
      } else {
        // Create Mode
        fetchHierarchies();
        resetForm();
      }
    }
  }, [isOpen, assetToEdit]);

  const fetchHierarchies = async () => {
    try {
      const [catsRes, locsRes] = await Promise.all([
        api.get('/asset-categories/hierarchy'),
        api.get('/locations')
      ]);
      setCategoryHierarchy(catsRes.data);
      setLocations(locsRes.data.filter((l: Location) => l.isActive));
    } catch (err) {
      console.error(err);
      setError('Failed to load form data.');
    }
  };

  const resetForm = () => {
    const defaultOp = user?.role === 'MANUFACTURING_SUPERVISOR' ? 'MANUFACTURING' : 'REPAIRING';
    setOperation(defaultOp);
    setAssetNumber('');
    setRemark('');
    setSelectedGrandparent('');
    setSelectedParent('');
    setSelectedChild('');
    setSelectedLocation('');
    setError(null);
  };

  // Determine final selected category code
  let finalCategoryCode = selectedGrandparent;
  if (selectedChild) finalCategoryCode = selectedChild;
  else if (selectedParent) finalCategoryCode = selectedParent;

  // Category selections
  const grandparentOptions = operation === 'MANUFACTURING' 
    ? categoryHierarchy.filter(c => ['WAGON', 'CRANE'].includes(c.code))
    : categoryHierarchy;
    
  const parentOptions = grandparentOptions.find(c => c.code === selectedGrandparent)?.children || [];
  const childOptions = parentOptions.find(c => c.code === selectedParent)?.children || [];

  // Reset category if not in allowed list
  useEffect(() => {
    if (selectedGrandparent && !grandparentOptions.find(c => c.code === selectedGrandparent)) {
      setSelectedGrandparent('');
      setSelectedParent('');
      setSelectedChild('');
    }
  }, [operation, grandparentOptions, selectedGrandparent]);


  const getIdentificationRule = () => {
    let rule: IdentificationRule | undefined = undefined;
    const gp = grandparentOptions.find(c => c.code === selectedGrandparent);
    if (gp) {
      if (gp.identificationRule) rule = gp.identificationRule;
      const p = gp.children?.find(c => c.code === selectedParent);
      if (p) {
        if (p.identificationRule) rule = p.identificationRule;
        const ch = p.children?.find(c => c.code === selectedChild);
        if (ch && ch.identificationRule) rule = ch.identificationRule;
      }
    }
    return rule;
  };

  const idRule = getIdentificationRule();

  const handleAssetNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (idRule) {
      if (idRule.type === 'NUMERIC') {
        val = val.replace(/\D/g, ''); // Remove non-digits
      }
      if (val.length > idRule.length) {
        val = val.slice(0, idRule.length); // Enforce max length
      }
    }
    setAssetNumber(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate Asset Number length before submitting
    if (idRule && assetNumber.length !== idRule.length) {
      setError(`Asset Number must be exactly ${idRule.length} ${idRule.type === 'NUMERIC' ? 'digits' : 'characters'} long.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (assetToEdit) {
        // Edit (Change Status)
        await api.patch(`/assets/${assetToEdit.assetNumber}/status`, {
          status
        });
      } else {
        // Create
        if (!finalCategoryCode) {
          throw new Error('Please select an Asset Category.');
        }
        if (!selectedLocation) {
          throw new Error('Please select a specific physical location.');
        }
        await api.post('/assets', {
          operation,
          categoryCode: finalCategoryCode,
          assetNumber,
          currentLocationCode: selectedLocation,
          remark
        });
        toast.success(`Asset ${assetNumber} registered successfully!`);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'An error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-white/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-white border-2 border-gray-600 rounded-md shadow-2xl overflow-hidden mt-16 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-600 bg-white sticky top-0 z-10">
          <h3 className="text-lg font-semibold text-gray-900">
            {assetToEdit ? 'Change Asset Status' : 'Register New Asset'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && (
            <div className="m-6 mb-0 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            {assetToEdit ? (
              <div className="space-y-6">
                {/* EDIT MODE */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Asset Number</label>
                    <div className="p-3 bg-gray-50 border-2 border-gray-600 rounded-md text-gray-900 font-medium">
                      {assetToEdit.assetNumber}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Current Status</label>
                    <div className="p-3 bg-gray-50 border-2 border-gray-600 rounded-md text-gray-900 font-medium">
                      {assetToEdit.status.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">New Status</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'IN_REPAIR', label: 'In Repair' },
                      { value: 'IN_MANUFACTURING', label: 'In Manufacturing' },
                      { value: 'CONDEMNED', label: 'Condemned' },
                      { value: 'READY_TO_DISPATCH', label: 'Ready to Dispatch' },
                      { value: 'DISPATCHED', label: 'Dispatched' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setStatus(value)}
                        className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors ${
                          status === value
                            ? 'border-gray-900 bg-gray-200 text-gray-900'
                            : 'border-gray-600 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Remark</label>
                  <textarea
                    required
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="block w-full border-2 border-gray-600 rounded-md p-3 focus:outline-none focus:border-gray-900 bg-white text-gray-900 transition-colors sm:text-sm"
                    rows={3}
                    placeholder="Reason for status change..."
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* CREATE MODE */}
                
                {/* Pipeline Selection */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Pipeline</label>
                  <div className="flex gap-3">
                    {['REPAIRING', 'MANUFACTURING'].map(op => {
                      if (user?.role === 'MANUFACTURING_SUPERVISOR' && op !== 'MANUFACTURING') return null;
                      if (user?.role === 'REPAIR_SUPERVISOR' && op !== 'REPAIRING') return null;
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => {
                            setOperation(op);
                            setSelectedLocation('');
                          }}
                          className={`px-5 py-2.5 rounded-md text-sm font-medium border-2 transition-colors ${
                            operation === op
                              ? 'border-gray-900 bg-gray-200 text-gray-900'
                              : 'border-gray-600 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {op}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category Selection */}
                <div className="space-y-4 p-4 rounded-md border-2 border-gray-600 bg-white">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Asset Type</label>
                    <div className="flex flex-wrap gap-2">
                      {grandparentOptions.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => {
                            setSelectedGrandparent(c.code);
                            setSelectedParent('');
                            setSelectedChild('');
                          }}
                          className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors ${
                            selectedGrandparent === c.code
                              ? 'border-gray-900 bg-gray-200 text-gray-900'
                              : 'border-gray-600 bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {parentOptions.length > 0 && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Category</label>
                      <div className="flex flex-wrap gap-2">
                        {parentOptions.map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => {
                              setSelectedParent(c.code);
                              setSelectedChild('');
                            }}
                            className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors ${
                              selectedParent === c.code
                                ? 'border-gray-900 bg-gray-200 text-gray-900'
                                : 'border-gray-600 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {childOptions.length > 0 && (
                    <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Model</label>
                      <div className="flex flex-wrap gap-2">
                        {childOptions.map(c => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => setSelectedChild(c.code)}
                            className={`px-4 py-2 rounded-md text-sm font-medium border-2 transition-colors ${
                              selectedChild === c.code
                                ? 'border-gray-900 bg-gray-200 text-gray-900'
                                : 'border-gray-600 bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Location Selection (Flat List) */}
                <div className="space-y-4 p-4 rounded-md border-2 border-gray-600 bg-gray-50">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Physical Location</h4>
                  <div>
                    <button
                      type="button"
                      onClick={() => setIsLocationModalOpen(true)}
                      className="flex items-center justify-between w-full border-2 border-gray-600 rounded-md p-2.5 focus:outline-none focus:border-gray-900 bg-white hover:bg-gray-50 transition-colors sm:text-sm text-left"
                    >
                      <span className={selectedLocation ? "text-gray-900 font-medium" : "text-gray-500"}>
                        {selectedLocation ? `${locations.find(l => l.code === selectedLocation)?.name || selectedLocation} (${selectedLocation})` : "Select Initial Location..."}
                      </span>
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    </button>
                    <LocationSelectModal
                      isOpen={isLocationModalOpen}
                      onClose={() => setIsLocationModalOpen(false)}
                      locations={locations}
                      onSelect={setSelectedLocation}
                      title="Select Initial Location"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 flex items-center">
                      Asset Number 
                      {idRule && (
                        <span className="text-gray-400 normal-case font-normal ml-1">
                          ({idRule.length} {idRule.type === 'NUMERIC' ? 'digits' : 'chars'})
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      required
                      value={assetNumber}
                      onChange={handleAssetNumberChange}
                      className="block w-full border-2 border-gray-600 rounded-md p-3 focus:outline-none focus:border-gray-900 bg-white transition-colors sm:text-sm"
                      placeholder={idRule?.type === 'NUMERIC' ? "e.g. 12345" : "e.g. ABCDE"}
                    />
                  </div>
                  <div>
                     <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Remark</label>
                    <textarea
                      required
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      className="block w-full border-2 border-gray-600 rounded-md p-3 focus:outline-none focus:border-gray-900 bg-white transition-colors sm:text-sm"
                      rows={2}
                      placeholder="Initial registration..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="pt-6 flex justify-end gap-3 sticky bottom-0 bg-white/90 backdrop-blur pb-2">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-md border-2 border-gray-600 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-md border-2 border-gray-900 bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (assetToEdit ? 'Update Status' : 'Register Asset')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
