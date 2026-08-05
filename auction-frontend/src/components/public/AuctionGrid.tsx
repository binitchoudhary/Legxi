import { cn } from '@/utils/utils';

interface AuctionGridProps {
  children: React.ReactNode;
  className?: string;
}

export function AuctionGrid({ children, className }: AuctionGridProps) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8", className)}>
      {children}
    </div>
  );
}
