import { formatCurrency } from '@/utils/formatters';
import { cn } from '@/utils/utils';
import { TrendingUp, Users } from 'lucide-react';

interface PriceCardProps {
  currentPricePaise: string;
  bidsCount?: number;
  className?: string;
  variant?: 'sm' | 'lg';
}

export function PriceCard({ currentPricePaise, bidsCount = 0, className, variant = 'sm' }: PriceCardProps) {
  const isLg = variant === 'lg';

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
        <TrendingUp className="w-3 h-3" />
        <span className="text-xs font-medium uppercase tracking-wider">Current Bid</span>
      </div>
      <div className="flex items-end gap-3">
        <span className={cn("font-bold tracking-tight text-foreground", isLg ? "text-4xl" : "text-xl")}>
          {formatCurrency(currentPricePaise)}
        </span>
        {bidsCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <Users className="w-3 h-3" />
            {bidsCount} {bidsCount === 1 ? 'bid' : 'bids'}
          </span>
        )}
      </div>
    </div>
  );
}
