'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsEmptyState } from './AnalyticsEmptyState';
import { cn } from '@/utils/utils';

interface AnalyticsChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
}

/**
 * AnalyticsChartContainer is a reusable wrapper for future chart implementations.
 * Per RC1 rules, no chart library is installed and this simply acts as a placeholder container.
 */
export function AnalyticsChartContainer({
  title,
  description,
  className,
  ...props
}: AnalyticsChartContainerProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {/* Placeholder Illustration / Message */}
        <div className="rounded-lg border border-dashed bg-muted/5 p-4">
          <AnalyticsEmptyState isWidget />
        </div>
      </CardContent>
    </Card>
  );
}
