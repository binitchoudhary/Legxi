import { UserRole } from '@/features/auth/store/authStore';

export interface AdminNavItem {
  id: string;
  label: string;
  icon: string;
  href: string;
  requiredRoles: UserRole[];
  featureFlag?: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export const adminNavigation: AdminNavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
    href: '/admin/dashboard',
    requiredRoles: ['ADMIN', 'MANAGER'],
    enabled: true,
  },
  {
    id: 'auctions',
    label: 'Auctions',
    icon: 'Gavel',
    href: '/admin/auctions',
    requiredRoles: ['ADMIN', 'MANAGER'],
    enabled: true,
  },
  {
    id: 'settlements',
    label: 'Settlements',
    icon: 'HandCoins',
    href: '/admin/settlements',
    requiredRoles: ['ADMIN'],
    enabled: true,
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'CreditCard',
    href: '/admin/payments',
    requiredRoles: ['ADMIN'],
    enabled: true,
  },
  {
    id: 'transfers',
    label: 'Transfers',
    icon: 'ArrowRightLeft',
    href: '/admin/transfers',
    requiredRoles: ['ADMIN'],
    enabled: true,
  },
  {
    id: 'certificates',
    label: 'Certificates',
    icon: 'Award',
    href: '/admin/certificates',
    requiredRoles: ['ADMIN'],
    enabled: true,
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: 'LineChart',
    href: '/admin/analytics',
    requiredRoles: ['ADMIN', 'MANAGER'],
    enabled: true,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
    href: '/admin/settings',
    requiredRoles: ['ADMIN'],
    enabled: true,
    comingSoon: true,
  }
];
