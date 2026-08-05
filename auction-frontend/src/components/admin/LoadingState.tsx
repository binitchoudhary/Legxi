import * as React from 'react';
import { cn } from '@/utils/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  text?: string;
  className?: string;
  'data-testid'?: string;
}

export function LoadingState({
  text = 'Loading...',
  className,
  'data-testid': testId = 'loading-state'
}: LoadingStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8 min-h-[400px]", className)}
      data-testid={testId}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" aria-hidden="true" />
      <p className="text-sm text-muted-foreground animate-pulse">{text}</p>
    </div>
  );
}
