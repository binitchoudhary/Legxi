import * as React from 'react';
import { cn } from '@/utils/utils';

export interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp: string | Date;
  status?: 'default' | 'success' | 'warning' | 'destructive';
  icon?: React.ReactNode;
}

interface TimelineProps extends React.HTMLAttributes<HTMLDivElement> {
  events: TimelineEvent[];
}

export function Timeline({ events, className, ...props }: TimelineProps) {
  return (
    <div className={cn('relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-muted before:to-transparent', className)} {...props}>
      {events.map((event, index) => (
        <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
          {/* Icon */}
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-muted text-muted-foreground shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow",
            event.status === 'success' && 'bg-emerald-500/20 text-emerald-600 border-emerald-50',
            event.status === 'warning' && 'bg-amber-500/20 text-amber-600 border-amber-50',
            event.status === 'destructive' && 'bg-destructive/20 text-destructive border-destructive/10'
          )}>
            {event.icon ? event.icon : <div className="w-2 h-2 rounded-full bg-current" />}
          </div>
          {/* Card */}
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">
              <time className="text-xs text-muted-foreground mb-1 sm:mb-0">
                {typeof event.timestamp === 'string' ? event.timestamp : event.timestamp.toLocaleString()}
              </time>
            </div>
            <div className="text-sm font-semibold">{event.title}</div>
            {event.description && <div className="text-sm text-muted-foreground mt-1">{event.description}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
