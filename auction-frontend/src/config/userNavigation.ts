import { 
  LayoutDashboard, 
  Gavel, 
  CheckCircle2, 
  XCircle, 
  Award, 
  Bell, 
  User, 
  Settings, 
  ShieldCheck, 
  MonitorSmartphone 
} from 'lucide-react';

export const userNavigation = [
  {
    title: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', href: '/user/dashboard' },
    ]
  },
  {
    title: 'Auctions',
    items: [
      { id: 'my-auctions', label: 'My Auctions', icon: 'Gavel', href: '/user/auctions' },
      { id: 'active-auctions', label: 'Active Auctions', icon: 'Gavel', href: '/user/active' },
      { id: 'won-auctions', label: 'Won Auctions', icon: 'CheckCircle2', href: '/user/won' },
      { id: 'lost-auctions', label: 'Lost Auctions', icon: 'XCircle', href: '/user/lost' },
    ]
  },
  {
    title: 'Assets',
    items: [
      { id: 'certificates', label: 'Certificates', icon: 'Award', href: '/user/certificates' },
    ]
  },
  {
    title: 'Account',
    items: [
      { id: 'profile', label: 'Profile', icon: 'User', href: '/user/profile' },
      { id: 'notifications', label: 'Notifications', icon: 'Bell', href: '/user/notifications' },
      { id: 'preferences', label: 'Preferences', icon: 'Settings', href: '/user/preferences' },
      { id: 'security', label: 'Security', icon: 'ShieldCheck', href: '/user/security' },
      { id: 'sessions', label: 'Sessions', icon: 'MonitorSmartphone', href: '/user/sessions' },
    ]
  }
];

export const userIconMap: Record<string, any> = {
  LayoutDashboard,
  Gavel,
  CheckCircle2,
  XCircle,
  Award,
  Bell,
  User,
  Settings,
  ShieldCheck,
  MonitorSmartphone,
};
