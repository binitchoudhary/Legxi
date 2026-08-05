'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/utils';
import { AnalyticsLoadingState } from './AnalyticsLoadingState';

interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: React.ReactNode;
  description?: string;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export function StatTile({
  title,
  value,
  description,
  icon,
  isLoading,
  className,
  ...props
}: StatTileProps) {
  return (
    <Card className={cn('', className)} {...props} data-testid="stat-tile">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <AnalyticsLoadingState />
        ) : (
          <>
            <div className="text-2xl font-bold truncate">{value}</div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
