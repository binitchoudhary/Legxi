'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, LayoutGrid, CheckSquare, Settings2, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { cn } from '@/utils/utils';

export interface Column<T> {
  id: string;
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface AdminTableProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  isError?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (columnId: string) => void;
  // Pagination
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  // Features
  csvExportDisabled?: boolean;
  bulkActionsDisabled?: boolean;
}

export function AdminTable<T extends { id: string | number }>({
  data,
  columns,
  isLoading,
  isError,
  emptyTitle = 'No data found',
  emptyDescription = 'There are no records to display.',
  onRetry,
  sortColumn,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  csvExportDisabled = true,
  bulkActionsDisabled = true,
}: AdminTableProps<T>) {
  const [density, setDensity] = React.useState<'default' | 'compact' | 'comfortable'>('default');
  const [visibleColumns, setVisibleColumns] = React.useState<Record<string, boolean>>(() => {
    // Basic persistent logic could go here
    return columns.reduce((acc, col) => ({ ...acc, [col.id]: true }), {});
  });

  const toggleColumn = (id: string) => {
    setVisibleColumns(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeColumns = columns.filter(col => visibleColumns[col.id]);

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  return (
    <div className="space-y-4">
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={bulkActionsDisabled} title="Bulk Actions Unavailable">
            <CheckSquare className="mr-2 h-4 w-4" />
            Bulk Actions
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {columns.map(col => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  checked={visibleColumns[col.id]}
                  onCheckedChange={() => toggleColumn(col.id)}
                >
                  {col.header}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Density
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem checked={density === 'compact'} onCheckedChange={() => setDensity('compact')}>Compact</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={density === 'default'} onCheckedChange={() => setDensity('default')}>Default</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={density === 'comfortable'} onCheckedChange={() => setDensity('comfortable')}>Comfortable</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" disabled={csvExportDisabled} title="Export Unavailable">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-md border bg-card relative overflow-x-auto max-h-[600px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <TableRow>
              {activeColumns.map(col => (
                <TableHead
                  key={col.id}
                  className={cn(
                    col.sortable && "cursor-pointer hover:bg-muted/50 transition-colors",
                    density === 'compact' && 'py-2',
                    density === 'comfortable' && 'py-4'
                  )}
                  onClick={() => col.sortable && onSort?.(col.id)}
                >
                  <div className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortColumn === col.id && (
                      sortDirection === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {activeColumns.map(col => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-5 w-[80%]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeColumns.length} className="h-64">
                  <EmptyState title={emptyTitle} description={emptyDescription} className="border-0 bg-transparent min-h-0" />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  {activeColumns.map(col => (
                    <TableCell
                      key={col.id}
                      className={cn(
                        density === 'compact' && 'py-1',
                        density === 'comfortable' && 'py-4'
                      )}
                    >
                      {col.cell ? col.cell(row) : (col.accessorKey ? String(row[col.accessorKey] || '') : '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages !== undefined && currentPage !== undefined && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
