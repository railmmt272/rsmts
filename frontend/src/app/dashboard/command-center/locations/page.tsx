'use client';

import { useEffect, useState } from 'react';
import CommandCenterNav from '@/components/CommandCenter/CommandCenterNav';
import api from '@/services/api';
import { ChevronDown, ChevronRight, Train } from 'lucide-react';

interface Location {
  code: string;
  name: string;
  isActive: boolean;
}

interface Asset {
  assetNumber: string;
  categoryCode: string;
  status: string;
  currentLocationCode: string;
}

export default function LocationsTopologyView() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch locations and assets concurrently
        const [locRes, assetRes] = await Promise.all([
          api.get('/locations'),
          api.get('/assets'),
        ]);
        setLocations(locRes.data.filter((l: Location) => l.isActive));
        setAssets(assetRes.data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch topology data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group assets by location
  const assetsByLocation = assets.reduce((acc, asset) => {
    const loc = asset.currentLocationCode;
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const toggleLocation = (code: string) => {
    setExpandedLocation(prev => prev === code ? null : code);
  };

  return (
    <div className="bg-white min-h-full">
      <CommandCenterNav />

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Locations Topology</h1>
        <p className="text-sm text-gray-500 mb-6">
          Live occupancy and asset distribution across all active locations.
        </p>

        {loading && <div className="text-gray-500 flex items-center gap-2"><div className="w-4 h-4 border-2 border-gray-900 border-t-transparent rounded-full animate-spin"></div> Loading topology...</div>}
        {error && <div className="text-red-500 bg-red-50 p-4 rounded-md border border-red-200">{error}</div>}

        {!loading && !error && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <div className="divide-y divide-gray-200">
              {locations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No active locations found.</div>
              ) : (
                locations.map((loc) => {
                  const locAssets = assetsByLocation[loc.code] || [];
                  const isExpanded = expandedLocation === loc.code;
                  
                  return (
                    <div key={loc.code} className="flex flex-col">
                      {/* Location Header Row */}
                      <div 
                        className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${
                          isExpanded ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => toggleLocation(loc.code)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                          <div>
                            <h3 className="font-bold text-gray-900 text-base">{loc.code}</h3>
                            <p className="text-xs text-gray-500">{loc.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs text-gray-500 mr-2">Occupancy:</span>
                            <span className={`font-bold inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm ${
                              locAssets.length > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {locAssets.length}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Assets List */}
                      {isExpanded && (
                        <div className="bg-gray-50 border-t border-gray-200 p-4">
                          {locAssets.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4 italic">No assets currently in this location.</p>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-sm whitespace-nowrap bg-white rounded-md border border-gray-200 shadow-sm">
                                <thead className="bg-gray-100 text-gray-700 uppercase tracking-wider text-xs">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold">Asset Number</th>
                                    <th className="px-4 py-3 font-semibold">Category</th>
                                    <th className="px-4 py-3 font-semibold">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {locAssets.map((asset) => (
                                    <tr key={asset.assetNumber} className="hover:bg-blue-50/50">
                                      <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                                        <Train className="h-4 w-4 text-gray-400" />
                                        {asset.assetNumber}
                                      </td>
                                      <td className="px-4 py-3 text-gray-600">{asset.categoryCode}</td>
                                      <td className="px-4 py-3">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                          {asset.status.replace(/_/g, ' ')}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
