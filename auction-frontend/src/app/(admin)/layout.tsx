'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavigation } from '@/config/adminNavigation';
import { RoleGuard } from '@/features/auth/components/RoleGuard';
import { useAuthStore } from '@/features/auth/store/authStore';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, LayoutDashboard, Gavel, HandCoins, CreditCard, ArrowRightLeft, Award, LineChart, Settings, LogOut } from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Gavel,
  HandCoins,
  CreditCard,
  ArrowRightLeft,
  Award,
  LineChart,
  Settings,
};

import { useLogout } from '@/features/auth/hooks/useLogout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { logout } = useLogout();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <RoleGuard allowedRoles={['ADMIN', 'MANAGER']} fallback={<div className="p-8 text-center text-destructive">Unauthorized Access</div>}>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <div className="font-bold text-lg tracking-tight">LEGXI Admin</div>
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Sidebar Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden" 
            onClick={() => setSidebarOpen(false)} 
          />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
            <Link href="/admin/dashboard" className="font-bold tracking-tight text-lg">LEGXI Admin</Link>
            <Button variant="ghost" size="icon" className="md:hidden -mr-2" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {adminNavigation.map((item) => {
              if (!item.enabled) return null;
              if (user && !item.requiredRoles.some(role => user.roles.includes(role))) return null;
              
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = pathname?.startsWith(item.href);

              return (
                <Link
                  key={item.id}
                  href={item.comingSoon ? '#' : item.href}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    item.comingSoon && "opacity-60 cursor-default hover:bg-transparent hover:text-muted-foreground"
                  )}
                  onClick={(e) => {
                    if (item.comingSoon) e.preventDefault();
                    else setSidebarOpen(false);
                  }}
                >
                  <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                  <span className="truncate">{item.label}</span>
                  {item.comingSoon && (
                    <span className="ml-auto text-[10px] uppercase font-bold tracking-wider bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      Soon
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t shrink-0">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                {user?.email?.[0] || 'A'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.roles.join(', ')}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden md:h-screen">
          <header className="hidden md:flex h-16 items-center justify-between px-8 border-b bg-card shrink-0">
            <div className="text-sm text-muted-foreground capitalize">
              {pathname?.split('/').filter(Boolean).join(' / ')}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>

      </div>
    </RoleGuard>
  );
}
