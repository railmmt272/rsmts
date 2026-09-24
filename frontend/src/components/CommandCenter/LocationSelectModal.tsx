import React, { useState, useMemo, useEffect } from 'react';
import { X, Search } from 'lucide-react';

export interface LocationOption {
  code: string;
  name: string;
}

interface LocationSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  locations: (string | LocationOption)[];
  onSelect: (locationCode: string) => void;
  title?: string;
  allowAll?: boolean;
}

export default function LocationSelectModal({
  isOpen,
  onClose,
  locations,
  onSelect,
  title = "Select Location",
  allowAll = false
}: LocationSelectModalProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Reset search term when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const normalizedLocations = useMemo(() => {
    return locations.map(loc => {
      if (typeof loc === 'string') {
        return { code: loc, name: loc };
      }
      return loc;
    });
  }, [locations]);

  const filteredLocations = useMemo(() => {
    if (!searchTerm) return normalizedLocations;
    const lower = searchTerm.toLowerCase();
    return normalizedLocations.filter(loc => 
      loc.code.toLowerCase().includes(lower) || 
      loc.name.toLowerCase().includes(lower)
    );
  }, [normalizedLocations, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
      {/* Click outside to close (optional, but good UX) */}
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white border-2 border-gray-600 rounded-md shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-gray-600 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-200 rounded-md transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search locations by code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 border-2 border-gray-300 rounded-md text-sm focus:outline-none focus:border-gray-900 transition-colors"
              autoFocus
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
          {allowAll && !searchTerm && (
            <div className="mb-3">
               <button
                  onClick={() => {
                    onSelect("ALL");
                    onClose();
                  }}
                  className="w-full flex flex-col items-start p-3 text-left border-2 border-gray-200 bg-white rounded-md hover:border-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
                >
                  <span className="font-semibold text-gray-900 text-sm">All Locations</span>
                  <span className="text-xs text-gray-500 mt-0.5">Show assets from any location</span>
                </button>
            </div>
          )}
          
          {filteredLocations.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 bg-white border border-gray-200 rounded-md">
              No locations found matching "{searchTerm}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredLocations.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => {
                    onSelect(loc.code);
                    onClose();
                  }}
                  className="flex flex-col items-start p-3 text-left border-2 border-gray-200 bg-white rounded-md hover:border-gray-900 hover:bg-gray-100 transition-colors focus:outline-none group"
                >
                  <span className="font-semibold text-gray-900 text-sm group-hover:text-black">{loc.code}</span>
                  {loc.name !== loc.code && (
                    <span className="text-xs text-gray-500 mt-1 line-clamp-2">{loc.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
