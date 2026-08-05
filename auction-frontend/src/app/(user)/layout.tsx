'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { userNavigation, userIconMap } from '@/config/userNavigation';
import { RoleGuard } from '@/features/auth/components/RoleGuard';
import { useAuthStore } from '@/features/auth/store/authStore';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, LogOut, LayoutDashboard } from 'lucide-react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <RoleGuard allowedRoles={['BIDDER', 'ADMIN', 'MANAGER']} fallback={<div className="p-8 text-center text-destructive">Unauthorized Access</div>}>
      <div className="min-h-screen bg-background flex flex-col md:flex-row">
        
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card">
          <div className="font-bold text-lg tracking-tight">LEGXI Workspace</div>
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
            <Link href="/user/dashboard" className="font-bold tracking-tight text-lg">My Workspace</Link>
            <Button variant="ghost" size="icon" className="md:hidden -mr-2" onClick={() => setSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
            {userNavigation.map((group) => (
              <div key={group.title}>
                <h4 className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.title}
                </h4>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = userIconMap[item.icon] || LayoutDashboard;
                    const isActive = pathname?.startsWith(item.href);

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors relative",
                          isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <Icon className={cn("mr-3 h-5 w-5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-4 border-t shrink-0 bg-muted/10">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase shrink-0">
                {user?.email?.[0] || 'U'}
              </div>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <p className="text-xs text-muted-foreground truncate">ID: {user?.id.slice(0, 8)}</p>
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
            <div className="text-sm text-muted-foreground capitalize flex items-center gap-2">
              <span>Workspace</span> 
              <span className="text-border">/</span>
              <span className="text-foreground font-medium">
                {pathname?.split('/').filter(Boolean).pop()?.replace('-', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Notification Bell / Theme Toggle placeholders per requirement */}
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
