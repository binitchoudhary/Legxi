import * as React from 'react';
import { cn } from '@/utils/utils';

interface PageToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageToolbar({ children, className, ...props }: PageToolbarProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4', className)} {...props}>
      {children}
    </div>
  );
}
