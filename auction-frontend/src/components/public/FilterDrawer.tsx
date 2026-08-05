'use client';

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FilterDrawerProps {
  onFilterChange: (filters: { status?: string, sort?: string }) => void;
}

export function FilterDrawer({ onFilterChange }: FilterDrawerProps) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline" className="flex gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mx-auto w-full max-w-sm">
          <DrawerHeader>
            <DrawerTitle>Filter Auctions</DrawerTitle>
            <DrawerDescription>Refine your search results.</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-6">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select onValueChange={(val) => onFilterChange({ status: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Auctions</SelectItem>
                  <SelectItem value="ACTIVE">Live Now</SelectItem>
                  <SelectItem value="DRAFT">Upcoming</SelectItem>
                  <SelectItem value="ENDED">Ended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select onValueChange={(val) => onFilterChange({ sort: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select sorting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ending_soon">Ending Soon</SelectItem>
                  <SelectItem value="newest">Newly Listed</SelectItem>
                  <SelectItem value="price_high">Price: High to Low</SelectItem>
                  <SelectItem value="price_low">Price: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter>
            <DrawerClose asChild>
              <Button>Apply Filters</Button>
            </DrawerClose>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
