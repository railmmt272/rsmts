'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export interface Asset {
  _id: string;
  assetNumber: string;
  categoryCode: string;
  currentLocationCode: string;
  currentPipeline: string;
  status: string;
  remark?: string;
  movementsCount?: number;
}

interface AssetCardProps {
  asset: Asset;
  onViewDetails: (asset: Asset) => void;
  onRoute: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  onDispatch?: (asset: Asset) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE:               { label: 'Active',              className: 'bg-green-100 text-green-700 border-green-300' },
  IN_WAGON_POH:            { label: 'In Wagon POH',           className: 'bg-blue-100 text-blue-700 border-blue-300' },
  IN_OTHERS:     { label: 'In Others',    className: 'bg-purple-100 text-purple-700 border-purple-300' },
  CONDEMNED:            { label: 'Condemned',           className: 'bg-red-100 text-red-700 border-red-300' },
  READY_TO_DISPATCH:    { label: 'Ready to Dispatch',   className: 'bg-amber-100 text-amber-700 border-amber-300' },
  DISPATCHED:           { label: 'Dispatched',          className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
};

export default function AssetCard({ asset, onViewDetails, onRoute, onDelete, onDispatch }: AssetCardProps) {
  const { user } = useAuth();
  const toast = useToast();
  const isViewer = user?.role === 'VIEWER';
  const canModifyStatusOrDelete = user?.role === 'WAGON_ADMIN' || user?.role === 'TPT_RAIL_ADMIN';

  const statusInfo = statusConfig[asset.status] ?? { label: asset.status, className: 'bg-gray-100 text-gray-700 border-gray-300' };

  const isReadyToDispatch = asset.status === 'READY_TO_DISPATCH';
  const isDispatched      = asset.status === 'DISPATCHED';

  return (
    <div
      onClick={() => onViewDetails(asset)}
      className={`bg-white border-2 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between hover:shadow-md transition-all cursor-pointer group gap-4 max-w-5xl ${
        isDispatched
          ? 'border-emerald-400 bg-emerald-50/30'
          : isReadyToDispatch
          ? 'border-amber-400 bg-amber-50/30'
          : 'border-gray-600 hover:border-gray-900'
      }`}
    >
      {/* Left Section */}
      <div className="flex-1 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-gray-500 min-w-32">Asset No :</span>
          <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
            {asset.assetNumber}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500 min-w-32">Current Location :</span>
          <span className="font-medium text-gray-900">{asset.currentLocationCode}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500 min-w-32">Remarks :</span>
          <span className="text-gray-700 line-clamp-1">{asset.remark || '-'}</span>
        </div>
      </div>

      {/* Middle Section */}
      <div className="flex-1 space-y-2 text-sm">
        <div className="flex items-start gap-2">
          <span className="text-gray-500 min-w-28">Pipeline :</span>
          <span className="text-gray-900 font-medium">{asset.currentPipeline}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-gray-500 min-w-28">Category :</span>
          <span className="text-gray-900 font-medium">{asset.categoryCode}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 min-w-28">Status :</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-col items-end justify-center md:pl-4 gap-2">
        {/* Dispatch action button */}
            {onDispatch && !isDispatched && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!canModifyStatusOrDelete) {
                    toast.error('You do not have permission to perform this action.');
                    return;
                  }
                  onDispatch(asset);
                }}
                className={`whitespace-nowrap text-xs font-semibold px-4 py-2 rounded-lg border-2 transition-colors ${
                  isReadyToDispatch
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-400 hover:border-emerald-600'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-400 hover:border-amber-600'
                }`}
              >
                {isReadyToDispatch ? '✓ Mark Dispatched' : 'Mark Ready to Dispatch'}
              </button>
            )}

            {isDispatched && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-300">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Dispatched
              </span>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isViewer) {
                  toast.error('You do not have permission to perform this action.');
                  return;
                }
                onRoute(asset);
              }}
              className="whitespace-nowrap text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border-2 border-gray-400 hover:border-gray-600 transition-colors"
            >
              Route / Reroute
            </button>

            {onDelete && canModifyStatusOrDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset);
                }}
                className="whitespace-nowrap text-xs font-medium text-red-600 bg-white hover:bg-red-50 px-4 py-2 rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors"
              >
                Delete
              </button>
            )}
      </div>
    </div>
  );
}
