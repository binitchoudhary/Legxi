'use client';

import * as React from 'react';
import { useForm as useRHForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { usePlaceBid } from '@/api/generated/bids/bids';
import { useLiveAuctionStore } from '../store/useLiveAuctionStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const bidSchema = z.object({
  amountPaise: z.string().regex(/^\d+$/, "Amount must be a valid number"),
});

type BidFormValues = z.infer<typeof bidSchema>;

export const BidPlacementForm = ({ auctionId }: { auctionId: string }) => {
  const { currentPricePaise, status, winnerDeclared } = useLiveAuctionStore();
  const { mutateAsync: placeBid, isPending } = usePlaceBid();

  const form = useRHForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: { amountPaise: '' },
  });

  const onSubmit = async (values: BidFormValues) => {
    try {
      await placeBid({
        data: {
          auctionId,
          amountPaise: values.amountPaise,
          isProxy: false
        }
      });
      form.reset();
      // Notice we do NOT update the UI immediately here to avoid duplicate entries.
      // We wait for the BidAccepted socket event.
    } catch (err: any) {
      toast.error(err.message || 'Failed to place bid');
    }
  };

  const isDisabled = status !== 'ACTIVE' || winnerDeclared || isPending;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex items-center gap-2">
        <Input 
          {...form.register('amountPaise')} 
          disabled={isDisabled}
          placeholder={`Min bid: ${Number(currentPricePaise || 0) + 100}`}
          className="flex-1"
        />
        <Button type="submit" disabled={isDisabled} className="w-32">
          {isPending ? 'Placing...' : 'Place Bid'}
        </Button>
      </div>
      {form.formState.errors.amountPaise && (
        <p className="text-sm text-destructive">{form.formState.errors.amountPaise.message}</p>
      )}
    </form>
  );
};
