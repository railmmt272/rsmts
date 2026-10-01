"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function CommandCenterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    
    if (user?.role === 'OPS_MANAGEMENT') {
      router.replace('/dashboard/command-center/mfg');
    } else {
      router.replace('/dashboard/command-center/repair');
    }
  }, [user, loading, router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  );
}
