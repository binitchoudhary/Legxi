import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter } from '@/components/ui/card';

export function AuctionCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50">
      <Skeleton className="h-64 w-full rounded-none" />
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-6 w-3/4" />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
          <div className="space-y-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

export function AuctionGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <AuctionCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function AuctionDetailsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 animate-in fade-in duration-500">
      {/* Gallery Skeleton */}
      <div className="space-y-4">
        <Skeleton className="aspect-square w-full rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="aspect-square w-full rounded-md" />
        </div>
      </div>
      
      {/* Details Skeleton */}
      <div className="space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
        </div>
        
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </div>
          </div>
          <Skeleton className="h-12 w-full mt-6" />
        </Card>
        
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
