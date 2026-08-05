'use client';

import * as React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils/utils';

interface DateRangeFilterProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function DateRangeFilter({ value = '30d', onChange, className }: DateRangeFilterProps) {
  // Local state for UI reflection per requirements (no actual backend requests)
  const [internalValue, setInternalValue] = React.useState(value);

  const handleChange = (val: string) => {
    setInternalValue(val);
    onChange?.(val);
  };

  return (
    <div className={cn('flex items-center gap-2', className)} data-testid="date-range-filter">
      <span className="text-sm font-medium text-muted-foreground">Range:</span>
      <Select value={internalValue} onValueChange={handleChange}>
        <SelectTrigger className="w-[140px] bg-background">
          <SelectValue placeholder="Select range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="7d">Last 7 Days</SelectItem>
          <SelectItem value="30d">Last 30 Days</SelectItem>
          <SelectItem value="90d">Last 90 Days</SelectItem>
          <SelectItem value="custom" disabled>Custom Range</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
