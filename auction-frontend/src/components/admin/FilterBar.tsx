'use client';

import * as React from 'react';
import { cn } from '@/utils/utils';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface FilterBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  activeCount?: number;
  onClear?: () => void;
}

export function FilterBar({ children, activeCount = 0, onClear, className, ...props }: FilterBarProps) {
  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />
            Filters
            {activeCount > 0 && (
              <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Options</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {children}
          </div>
          {onClear && activeCount > 0 && (
            <div className="flex justify-end pt-4 border-t">
              <Button variant="ghost" onClick={onClear}>Clear All</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
