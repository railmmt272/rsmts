'use client';

import { useEffect, useState, useMemo } from 'react';
import CommandCenterNav from '@/components/CommandCenter/CommandCenterNav';
import AssetCard, { Asset } from '@/components/Assets/AssetCard';
import AssetDetailsDrawer from '@/components/Assets/AssetDetailsDrawer';
import RouteRerouteDrawer from '@/components/Assets/RouteRerouteDrawer';
import LocationSelectModal from "@/components/CommandCenter/LocationSelectModal";
import { ChevronDown } from "lucide-react";
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

type MfgTab = 'ALL' | 'READY_TO_DISPATCH' | 'DISPATCHED';

export default function MfgView() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<MfgTab>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [locations, setLocations] = useState<{ code: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("ALL");
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const toast = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset page when tab, search, or location changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, selectedLocation]);

  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const lowerSearch = searchTerm.toLowerCase();
      const match = assets.find(a =>
        a.currentPipeline === "MANUFACTURING" &&
        a.assetNumber.toLowerCase().includes(lowerSearch)
      );

      if (match) {
        let targetTab: MfgTab = "ALL";
        if (match.status === "DISPATCHED") targetTab = "DISPATCHED";
        else if (match.status === "READY_TO_DISPATCH") targetTab = "READY_TO_DISPATCH";

        if (activeTab !== targetTab) {
          setActiveTab(targetTab);
        }
      }
    }
  }, [searchTerm, assets, activeTab]);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRouteOpen, setIsRouteOpen] = useState(false);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/assets');
      setAssets(res.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
    api.get("/locations?isActive=true").then(res => setLocations(res.data)).catch(console.error);
  }, []);

  const filteredAssets = useMemo(() => {
    // 1. Filter by currentPipeline === MANUFACTURING
    let mfgAssets = assets.filter((a) => a.currentPipeline === 'MANUFACTURING');

    // 2. Filter by search term
    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      mfgAssets = mfgAssets.filter((a) =>
        a.assetNumber.toLowerCase().includes(lowerSearch) ||
        a.categoryCode.toLowerCase().includes(lowerSearch) ||
        a.currentLocationCode.toLowerCase().includes(lowerSearch)
      );
    }

    // 3. Filter by location dropdown
    if (selectedLocation !== "ALL") {
      mfgAssets = mfgAssets.filter((a) => a.currentLocationCode === selectedLocation);
    }

    // 4. Filter by sub-tab
    switch (activeTab) {
      case 'ALL':
        return mfgAssets;
      case 'READY_TO_DISPATCH':
        return mfgAssets.filter((a) => a.status === 'READY_TO_DISPATCH');
      case 'DISPATCHED':
        return mfgAssets.filter((a) => a.status === 'DISPATCHED');
      default:
        return mfgAssets;
    }
  }, [assets, activeTab, searchTerm, selectedLocation]);

  // Pagination logic
  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const currentAssets = filteredAssets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleViewDetails = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsDetailsOpen(true);
  };

  const handleRoute = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsRouteOpen(true);
  };

  const handleMovementSuccess = () => {
    setIsRouteOpen(false);
    fetchAssets();
  };

  const handleDelete = async (asset: Asset) => {
    if (window.confirm(`Are you sure you want to delete asset ${asset.assetNumber}?`)) {
      try {
        await api.delete(`/assets/${asset.assetNumber}`);
        toast.success(`Asset ${asset.assetNumber} deleted successfully`);
        fetchAssets();
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Failed to delete asset');
      }
    }
  };

  const handleDispatch = async (asset: Asset) => {
    const nextStatus = asset.status === 'READY_TO_DISPATCH' ? 'DISPATCHED' : 'READY_TO_DISPATCH';
    const label = nextStatus === 'DISPATCHED' ? 'dispatched' : 'marked as Ready to Dispatch';
    try {
      await api.patch(`/assets/${asset.assetNumber}/status`, { status: nextStatus });
      toast.success(`Asset ${asset.assetNumber} ${label}`);
      fetchAssets();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update dispatch status');
    }
  };

  const tabs: { id: MfgTab; label: string }[] = [
    { id: 'ALL', label: 'All MFG' },
    { id: 'READY_TO_DISPATCH', label: '🟡 Ready to Dispatch' },
    { id: 'DISPATCHED', label: '✅ Dispatched' },
  ];

  return (
    <div className="bg-white flex-1 flex flex-col">
      <CommandCenterNav searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Sub tabs and Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="mb-2 text-sm text-gray-500 font-medium tracking-wide">Stages</div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-4 py-1 rounded-md text-sm transition-colors border-2 ${
                activeTab === t.id
                  ? t.id === 'DISPATCHED'
                    ? 'bg-emerald-100 border-emerald-500 text-emerald-800 font-medium'
                    : t.id === 'READY_TO_DISPATCH'
                    ? 'bg-amber-100 border-amber-500 text-amber-800 font-medium'
                    : 'bg-gray-200 border-gray-600 text-gray-900 font-medium'
                  : 'bg-white border-gray-600 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-sm text-gray-500 font-medium tracking-wide">Filter by Location</div>
          <button
            type="button"
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center justify-between w-full min-w-56 pl-3 pr-3 py-1.5 text-base border-2 border-gray-600 focus:outline-none focus:ring-gray-900 focus:border-gray-900 sm:text-sm rounded-md bg-white text-left"
          >
            <span className={selectedLocation !== "ALL" ? "text-gray-900 font-medium truncate" : "text-gray-500"}>
              {selectedLocation === "ALL" ? "All Locations" : `${locations.find(l => l.code === selectedLocation)?.name || selectedLocation} (${selectedLocation})`}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 ml-2 shrink-0" />
          </button>
          <LocationSelectModal
            isOpen={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            locations={locations}
            onSelect={setSelectedLocation}
            title="Filter by Location"
            allowAll={true}
          />
        </div>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-5xl animate-pulse">
              {/* Left Section */}
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-32">Asset No :</span>
                  <div className="h-5 w-32 bg-slate-200 rounded" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-32">Current Location :</span>
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-32">Remarks :</span>
                  <div className="h-5 w-48 bg-slate-100 rounded" />
                </div>
              </div>

              {/* Middle Section */}
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-28">Pipeline :</span>
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-28">Category :</span>
                  <div className="h-5 w-20 bg-slate-200 rounded" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 min-w-28">Status :</span>
                  <div className="h-6 w-24 bg-slate-200 rounded-full" />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex flex-col items-end justify-center md:pl-4 gap-2">
                <div className="h-9 w-36 bg-slate-200 rounded-lg" />
                <div className="h-9 w-32 bg-slate-200 rounded-lg" />
                <div className="h-9 w-20 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className="text-red-500">{error}</div>}

      {!loading && !error && filteredAssets.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <p className="text-gray-500">No assets found for this filter.</p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {currentAssets.map((asset) => (
          <AssetCard
            key={asset._id}
            asset={asset}
            onViewDetails={handleViewDetails}
            onRoute={handleRoute}
            onDelete={handleDelete}
            onDispatch={handleDispatch}
          />
        ))}
      </div>

      {/* Pagination Controls */}
      {!loading && !error && filteredAssets.length > 0 && (
        <div className="flex items-center justify-between pt-4 pb-2 mt-auto border-t border-gray-100">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAssets.length)}</span> of{' '}
            <span className="font-medium">{filteredAssets.length}</span> assets
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentPage === page
                      ? 'bg-gray-800 text-white font-medium'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {selectedAsset && (
        <>
          <AssetDetailsDrawer
            isOpen={isDetailsOpen}
            onClose={() => setIsDetailsOpen(false)}
            assetNumber={selectedAsset.assetNumber}
          />
          <RouteRerouteDrawer
            isOpen={isRouteOpen}
            onClose={() => setIsRouteOpen(false)}
            asset={selectedAsset}
            onSuccess={handleMovementSuccess}
          />
        </>
      )}
    </div>
  );
}
