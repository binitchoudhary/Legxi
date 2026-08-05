import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Button } from '@/components/ui/button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  className?: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong", 
  description = "An error occurred while loading this content.",
  className,
  onRetry
}: ErrorStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-destructive/5 border-destructive/20", className)}>
      <div className="w-16 h-16 mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
      {onRetry && (
        <Button variant="outline" className="mt-6" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
