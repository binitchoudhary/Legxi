import * as React from 'react';
import { cn } from '@/utils/utils';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function PageContainer({ children, className, ...props }: PageContainerProps) {
  return (
    <div className={cn('flex flex-col gap-6 p-6 md:p-8 w-full max-w-7xl mx-auto', className)} {...props}>
      {children}
    </div>
  );
}
