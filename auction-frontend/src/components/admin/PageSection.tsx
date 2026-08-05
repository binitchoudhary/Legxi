import * as React from 'react';
import { cn } from '@/utils/utils';

interface PageSectionProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  children: React.ReactNode;
}

export function PageSection({ title, children, className, ...props }: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)} {...props}>
      {title && <h2 className="text-lg font-medium text-foreground tracking-tight">{title}</h2>}
      <div>{children}</div>
    </section>
  );
}
