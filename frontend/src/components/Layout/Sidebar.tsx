'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Wrench,
  BarChart,
  Users,
  Settings,
  LucideIcon,
  ListTodo
} from 'lucide-react';
import Image from 'next/image';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const OPERATIONS_NAV: NavItem[] = [
  { label: 'Command Center', href: '/dashboard/command-center', icon: Wrench },
  { label: 'Shunting Programs', href: '/dashboard/shunting-programs', icon: ListTodo },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart },
];

const ADMINISTRATION_NAV: NavItem[] = [
  { label: 'Users', href: '/dashboard/users', icon: Users },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

import { useAuth } from '@/contexts/AuthContext';

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const isManagementOrAdmin = user?.role === 'SYSTEM_ADMIN' || user?.role === 'MANAGEMENT';

  const isRouteActive = (href: string) => {
    if (href === '/dashboard/command-center') {
      return pathname.startsWith('/dashboard/command-center');
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isRouteActive(item.href);
    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2 text-sm transition-colors ${active
          ? 'text-gray-900 font-bold'
          : 'text-gray-500 hover:text-gray-900 font-medium'
          }`}
      >
        <item.icon className={`h-4 w-4 ${active ? 'text-gray-900' : 'text-gray-400'}`} />
        {item.label}
      </Link>
    );
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-white h-screen flex flex-col overflow-y-auto">
      <div className="h-16 flex items-center pl-6 mt-4 mb-4">
        <Image
          src="/logo_bg_removed.png"
          alt="RSMTS Logo"
          width={40}
          height={40}
          className="object-contain"
          priority
        />
      </div>

      <div className="flex-1 px-3 py-4 space-y-8">
        <div>
          <div className="px-3 mb-4 text-xs font-bold text-blue-400 uppercase tracking-wider">
            OPERATIONS
          </div>
          <div className="space-y-2">
            {OPERATIONS_NAV.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </div>
        </div>

        {isManagementOrAdmin && (
          <div>
            <div className="px-3 mb-4 text-xs font-bold text-blue-400 uppercase tracking-wider">
              ADMINISTRATION
            </div>
            <div className="space-y-2">
              {ADMINISTRATION_NAV.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
