import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/utils';

export type StatusVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: string;
  variant?: StatusVariant;
}

export function StatusBadge({ status, variant = 'default', className, ...props }: StatusBadgeProps) {
  // Custom variants that aren't in standard shadcn badge
  const customVariants: Record<string, string> = {
    success: 'border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25',
    warning: 'border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25',
    info: 'border-transparent bg-blue-500/15 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25',
  };

  const isCustom = ['success', 'warning', 'info'].includes(variant);

  return (
    <Badge
      variant={isCustom ? 'outline' : (variant as any)}
      className={cn('capitalize font-medium', isCustom && customVariants[variant], className)}
      {...props}
    >
      {status.toLowerCase().replace(/_/g, ' ')}
    </Badge>
  );
}
