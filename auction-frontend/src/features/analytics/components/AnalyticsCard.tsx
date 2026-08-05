'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/utils';

interface AnalyticsCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function AnalyticsCard({
  title,
  description,
  action,
  children,
  className,
  ...props
}: AnalyticsCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props} data-testid="analytics-card">
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="space-y-1">
            {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </CardHeader>
      )}
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
