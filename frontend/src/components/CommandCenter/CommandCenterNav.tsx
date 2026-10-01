"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Plus, PackagePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import AssetFormModal from "@/components/Assets/AssetFormModal";

interface CommandCenterNavProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
}

export default function CommandCenterNav({ searchTerm = "", onSearchChange }: CommandCenterNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const isViewer = user?.role === "VIEWER";
  const isManagementOrAdmin = user?.role === "SYSTEM_ADMIN" || user?.role === "MANAGEMENT";
  
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  let tabs = [
    { name: "Wagon POH", href: "/dashboard/command-center/repair" },
    { name: "Others", href: "/dashboard/command-center/mfg" },
    { name: "Locations Topology", href: "/dashboard/command-center/locations" },
  ];

  const handleAssetSuccess = () => {
    // You could route based on what was created or just refresh the page
    // Since we don't know the exact pipeline created here easily without tweaking onSuccess,
    // refreshing the current route is safest if they are already on the correct page, 
    // or just let the data fetch hook in the page handle it if we trigger a re-fetch.
    // For simplicity, a router.refresh() will re-fetch server components or trigger client refetches if set up.
    window.location.reload(); // Simple approach to ensure the pages fetch new data
  };

  return (
    <div className="mb-6">
      {/* Actions Row */}
      <div className="mb-8 flex items-center justify-between">
        <div className="relative w-full max-w-xl">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="search assets"
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border-2 border-gray-600 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:border-gray-900 sm:text-sm transition-colors"
          />
        </div>
        <div className="flex items-center gap-4 ml-6">
          {isManagementOrAdmin && (
             <button 
              onClick={() => router.push('/dashboard/users?add=true')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          )}
          {!isViewer && (
              <button 
                onClick={() => setIsAssetModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none transition-colors"
              >
                <PackagePlus className="h-4 w-4" />
                Register Assets
              </button>
          )}
        </div>
      </div>
      <h1 className="text-xl text-gray-600 mb-4">
        Workshop Operations Command Center
      </h1>
      <div className="flex space-x-4">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={`px-6 py-1 text-sm font-medium border-2 rounded-md transition-colors ${
                isActive
                  ? "border-gray-900 bg-gray-200 text-gray-900"
                  : "border-gray-600 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {tab.name}
            </Link>
          );
        })}
      </div>
      
      {isAssetModalOpen && (
        <AssetFormModal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          onSuccess={handleAssetSuccess}
        />
      )}
    </div>
  );
}
