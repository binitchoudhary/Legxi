'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { DateRangeFilter } from '@/features/analytics/components/DateRangeFilter';
import { cn } from '@/utils/utils';

const analyticsNav = [
  { label: 'Overview', href: '/admin/analytics' },
  { label: 'Revenue', href: '/admin/analytics/revenue' },
  { label: 'Operations', href: '/admin/analytics/operations' },
  { label: 'Performance', href: '/admin/analytics/performance' },
];

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <PageContainer>
      <PageHeader 
        title="Analytics Dashboard" 
        description="Platform-wide operational, performance, and revenue analytics."
        action={<DateRangeFilter />}
      />

      {/* Analytics Sub-navigation */}
      <div className="border-b mb-6">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Analytics Navigation">
          {analyticsNav.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors",
                  isActive 
                    ? "border-primary text-primary" 
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="analytics-content">
        {children}
      </div>
    </PageContainer>
  );
}
