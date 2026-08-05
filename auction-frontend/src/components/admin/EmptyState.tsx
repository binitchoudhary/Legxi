import * as React from 'react';
import { cn } from '@/utils/utils';
import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ElementType;
  action?: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = FileQuestion,
  action,
  className,
  'data-testid': testId = 'empty-state'
}: EmptyStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[400px] border border-dashed rounded-lg bg-muted/10", className)}
      data-testid={testId}
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted/50 mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
