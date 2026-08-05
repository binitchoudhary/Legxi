'use client';

import * as React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/utils';

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch: (query: string) => void;
  debounceMs?: number;
}

export function SearchBar({ onSearch, debounceMs = 300, className, ...props }: SearchBarProps) {
  const [value, setValue] = React.useState(props.defaultValue || props.value || '');

  React.useEffect(() => {
    const handler = setTimeout(() => {
      onSearch(value as string);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, debounceMs, onSearch]);

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        placeholder="Search..."
        className="pl-9 bg-background"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label="Search"
        {...props}
      />
    </div>
  );
}
