import * as React from 'react';
import { CheckCircle2, Circle, Clock, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/utils/utils';

export interface TimelineItemProps {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'IDLE';
  title: string;
  description: string;
  timestamp?: string;
  isLast?: boolean;
}

export const StatusTimelineItem = ({ status, title, description, timestamp, isLast }: TimelineItemProps) => {
  const getIcon = () => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="h-6 w-6 text-green-500" />;
      case 'PROCESSING': return <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'FAILED': return <XCircle className="h-6 w-6 text-destructive" />;
      case 'PENDING': return <Clock className="h-6 w-6 text-yellow-500" />;
      case 'IDLE': return <Circle className="h-6 w-6 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="bg-background rounded-full">{getIcon()}</div>
        {!isLast && (
          <div className={cn(
            "w-0.5 flex-1 my-2",
            status === 'COMPLETED' ? "bg-green-500" : "bg-border"
          )} />
        )}
      </div>
      <div className="pb-8">
        <h4 className={cn("text-lg font-semibold", status === 'IDLE' ? 'text-muted-foreground' : '')}>{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
        {timestamp && <span className="text-xs text-muted-foreground/70 mt-2 block">{new Date(timestamp).toLocaleString()}</span>}
      </div>
    </div>
  );
};
