import * as React from 'react';
import { cn } from '@/utils/utils';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
  'data-testid'?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content. Please try again.',
  onRetry,
  className,
  'data-testid': testId = 'error-state'
}: ErrorStateProps) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[400px] border border-destructive/20 rounded-lg bg-destructive/5", className)}
      data-testid={testId}
    >
      <AlertTriangle className="h-12 w-12 text-destructive mb-4" aria-hidden="true" />
      <h3 className="text-xl font-semibold text-destructive mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        {description}
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="gap-2" aria-label="Retry loading content">
          <RefreshCcw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}
