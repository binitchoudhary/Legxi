'use client';

import { useState, useEffect } from 'react';
import { calculateTimeRemaining } from '@/utils/formatters';
import { Clock } from 'lucide-react';
import { cn } from '@/utils/utils';
import { Badge } from '@/components/ui/badge';

interface CountdownBadgeProps {
  endTime?: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'SETTLED' | 'CANCELLED';
  className?: string;
  variant?: 'default' | 'card' | 'hero';
}

export function CountdownBadge({ endTime, status, className, variant = 'default' }: CountdownBadgeProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isEndingSoon, setIsEndingSoon] = useState(false);

  useEffect(() => {
    if (status !== 'ACTIVE' || !endTime) {
      setTimeout(() => {
        setTimeLeft(status === 'DRAFT' ? 'Starts Soon' : 'Ended');
      }, 0);
      return;
    }

    const updateTimer = () => {
      setTimeLeft(calculateTimeRemaining(endTime));
      
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const diff = end - now;
      
      // If less than 24 hours (86400000 ms), mark as ending soon for styling
      setIsEndingSoon(diff > 0 && diff < 86400000);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [endTime, status]);

  if (variant === 'card') {
    return (
      <div className={cn("flex items-center text-xs font-medium", isEndingSoon ? "text-destructive" : "text-muted-foreground", className)}>
        <Clock className="w-3 h-3 mr-1" />
        {timeLeft}
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-background/50 backdrop-blur-md",
        isEndingSoon ? "border-destructive text-destructive" : "border-border text-foreground",
        className
      )}>
        <div className={cn("w-2 h-2 rounded-full", status === 'ACTIVE' ? "bg-emerald-500 animate-pulse" : "bg-muted")} />
        <span className="text-sm font-semibold tracking-wide uppercase">{timeLeft}</span>
      </div>
    );
  }

  return (
    <Badge variant={isEndingSoon ? 'destructive' : 'secondary'} className={className}>
      <Clock className="w-3 h-3 mr-1" />
      {timeLeft}
    </Badge>
  );
}
