import { FolderSearch } from 'lucide-react';
import { cn } from '@/utils/utils';

interface EmptyStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function EmptyState({ 
  title = "No results found", 
  description = "We couldn't find any items matching your criteria.",
  className 
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-lg bg-muted/10", className)}>
      <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
        <FolderSearch className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
      <p className="text-muted-foreground mt-2 max-w-sm">{description}</p>
    </div>
  );
}
