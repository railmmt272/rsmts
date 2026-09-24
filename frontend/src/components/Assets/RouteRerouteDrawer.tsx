'use client';

import { useEffect, useState } from 'react';
import { X, ArrowRight, AlertCircle, ChevronDown } from 'lucide-react';
import api from '@/services/api';
import { Asset } from './AssetCard';
import { useToast } from '@/contexts/ToastContext';
import LocationSelectModal from '../CommandCenter/LocationSelectModal';

interface RouteRerouteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  onSuccess: () => void;
}

export default function RouteRerouteDrawer({
  isOpen,
  onClose,
  asset,
  onSuccess,
}: RouteRerouteDrawerProps) {
  const [destinations, setDestinations] = useState<string[]>([]);
  const [selectedDestination, setSelectedDestination] = useState('');
  const [remark, setRemark] = useState('');
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const toast = useToast();

  // Fetch allowed destinations when drawer opens
  useEffect(() => {
    if (!isOpen || !asset) return;

    const fetchDestinations = async () => {
      try {
        setLoadingDestinations(true);
        setError('');
        
        const res = await api.get('/locations');
        const activeLocations = res.data
          .filter((loc: any) => loc.isActive)
          .map((loc: any) => loc.code);
        
        setDestinations(activeLocations);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch allowed destinations');
      } finally {
        setLoadingDestinations(false);
      }
    };

    fetchDestinations();
    
    // Reset form state
    setSelectedDestination('');
    setRemark('');
  }, [isOpen, asset]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDestination || !remark.trim()) {
      setError('Destination and remark are required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      await api.post('/movements', {
        assetNumber: asset.assetNumber,
        toLocationCode: selectedDestination,
        remark: remark.trim()
      });

      toast.success(`Asset successfully moved to ${selectedDestination}`);
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to move asset';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-white/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white border-2 border-gray-600 rounded-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-600 bg-white">
          <h3 className="text-lg font-semibold text-gray-900">Route / Reroute Asset</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">Asset No.</div>
            <div className="text-xl font-bold text-gray-900 mb-4">{asset.assetNumber}</div>
            
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex-1 p-2 bg-white rounded border border-gray-200 text-center text-gray-700">
                {asset.currentLocationCode}
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <div className="flex-1 p-2 bg-blue-50 rounded border border-blue-200 text-center text-blue-700">
                {selectedDestination || 'Select...'}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-md">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="destination" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Destination <span className="text-red-500">*</span>
              </label>
              
              {loadingDestinations ? (
                <div className="p-3 bg-gray-50 text-gray-500 text-sm rounded-md border border-gray-200 animate-pulse">
                  Loading allowed destinations...
                </div>
              ) : destinations.length === 0 ? (
                <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded-md border border-yellow-200">
                  No valid destinations available based on current routing rules.
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="flex items-center justify-between w-full border-2 border-gray-600 rounded-md p-3 focus:outline-none focus:border-gray-900 bg-white hover:bg-gray-50 transition-colors sm:text-sm text-left"
                  >
                    <span className={selectedDestination ? "text-gray-900 font-medium" : "text-gray-500"}>
                      {selectedDestination || "Select location..."}
                    </span>
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  </button>
                  <LocationSelectModal
                    isOpen={isLocationModalOpen}
                    onClose={() => setIsLocationModalOpen(false)}
                    locations={destinations}
                    onSelect={setSelectedDestination}
                    title="Select Destination"
                  />
                </>
              )}
            </div>

            <div>
              <label htmlFor="remark" className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Remark <span className="text-red-500">*</span>
              </label>
              <textarea
                id="remark"
                required
                rows={4}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Enter reason for movement..."
                className="block w-full border-2 border-gray-600 rounded-md p-3 focus:outline-none focus:border-gray-900 bg-white transition-colors sm:text-sm resize-none"
              />
            </div>

            <div className="pt-4 flex gap-3 justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || loadingDestinations || destinations.length === 0}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Moving...' : 'Move Asset'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
