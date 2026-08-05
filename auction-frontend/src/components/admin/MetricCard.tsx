import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: number;
    label: string;
    direction: 'up' | 'down' | 'neutral';
  };
  isLoading?: boolean;
  isError?: boolean;
}

export function MetricCard({
  title,
  value,
  icon,
  description,
  trend,
  isLoading,
  isError,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card className={cn('', className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon && <div className="h-4 w-4 text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 mt-1">
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-4 w-[150px]" />
          </div>
        ) : isError ? (
          <div className="text-2xl font-bold text-muted-foreground">Unavailable</div>
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {(description || trend) && (
              <div className="mt-1 flex items-center text-xs">
                {trend && (
                  <span
                    className={cn('mr-2 font-medium', {
                      'text-emerald-500': trend.direction === 'up',
                      'text-destructive': trend.direction === 'down',
                      'text-muted-foreground': trend.direction === 'neutral',
                    })}
                  >
                    {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
                    {trend.value}%
                  </span>
                )}
                {description && <span className="text-muted-foreground">{description}</span>}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
