'use client';

import * as React from 'react';
import { cn } from '@/utils/utils';

interface AnalyticsSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export function AnalyticsSection({
  title,
  description,
  children,
  className,
  ...props
}: AnalyticsSectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props} data-testid="analytics-section">
      {(title || description) && (
        <div className="mb-4">
          {title && <h2 className="text-lg font-medium text-foreground tracking-tight">{title}</h2>}
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}
