import * as React from 'react';
import { useSettlementViewModel } from '../hooks/useSettlementViewModel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AXIOS_INSTANCE } from '@/api/client/axios';
import { toast } from 'sonner';
import { useGetAuction } from '@/api/generated/auctions/auctions';

export const ActionPanel = ({ auctionId }: { auctionId: string }) => {
  const { settlement, payment, transfer, certificate, isLoading } = useSettlementViewModel(auctionId);
  const auctionQuery = useGetAuction(auctionId);
  const [isProcessing, setIsProcessing] = React.useState(false);

  const auctionRes = auctionQuery.data?.data;
  const auction = (auctionRes && 'success' in auctionRes && auctionRes.success) ? auctionRes.data : undefined;
  const displayAmount = auction ? Number(auction.currentPricePaise) / 100 : 0;

  if (isLoading || !auction) {
    return <Card className="animate-pulse h-48"><CardContent/></Card>;
  }

  const handlePay = async () => {
    try {
      setIsProcessing(true);
      // Initiate payment intent with the backend. 
      // The frontend strictly does not handle PCI data.
      const res = await AXIOS_INSTANCE.post(`/payments/settlement/${settlement?.id}/initiate`);
      
      // Backend should return a redirect URL to the gateway (e.g. Stripe Checkout)
      if (res.data.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        toast.error("Gateway configuration error.");
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderContent = () => {
    // Certificate Ready
    if (certificate) {
      return (
        <div className="text-center space-y-4">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg inline-flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-5 w-5" /> Ownership Successfully Transferred
          </div>
          <p className="text-muted-foreground">Your cryptographic ownership certificate has been issued and attached to your identity.</p>
          <Button size="lg" className="w-full gap-2"><Download className="h-4 w-4" /> Download Certificate (PDF)</Button>
        </div>
      );
    }

    // Transfer Running
    if (transfer && transfer.status === 'PROCESSING') {
      return (
        <div className="text-center space-y-4 py-8">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <h3 className="text-xl font-semibold">Transferring Ownership</h3>
          <p className="text-muted-foreground">Your payment was secured. Please wait while the ledger transfers digital ownership to your account.</p>
        </div>
      );
    }

    // Payment Processing / Webhook Delay
    if (payment && (payment.status === 'AUTHORIZED' || payment.status === 'PAID')) {
      return (
        <div className="text-center space-y-4 py-8">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto" />
          <h3 className="text-xl font-semibold">Finalizing Settlement</h3>
          <p className="text-muted-foreground">Waiting for the gateway to confirm funds. Do not refresh.</p>
        </div>
      );
    }

    // Payment Failed
    if (payment && payment.status === 'FAILED') {
      return (
        <div className="text-center space-y-4 py-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h3 className="text-xl font-semibold text-destructive">Payment Failed</h3>
          <p className="text-muted-foreground">The transaction was declined by the gateway.</p>
          <Button size="lg" variant="destructive" onClick={handlePay} disabled={isProcessing} className="w-full">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : 'Retry Payment'}
          </Button>
        </div>
      );
    }

    // Default: Payment Pending
    return (
      <div className="space-y-6">
         <div className="flex justify-between items-center text-lg">
            <span>Winning Bid Amount</span>
            <span className="font-bold">${displayAmount.toFixed(2)}</span>
         </div>
         <div className="flex justify-between items-center text-lg border-b pb-4">
            <span>Buyer's Premium (10%)</span>
            <span className="font-bold">${(displayAmount * 0.10).toFixed(2)}</span>
         </div>
         <div className="flex justify-between items-center text-2xl font-black">
            <span>Total Due</span>
            <span>${(displayAmount * 1.10).toFixed(2)}</span>
         </div>
         
         <Button size="lg" onClick={handlePay} disabled={isProcessing || !settlement} className="w-full h-14 text-lg">
            {isProcessing ? <Loader2 className="mr-2 h-6 w-6 animate-spin"/> : 'Pay Now via Secure Gateway'}
         </Button>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Required Action</CardTitle>
      </CardHeader>
      <CardContent>
        {renderContent()}
      </CardContent>
    </Card>
  );
};

