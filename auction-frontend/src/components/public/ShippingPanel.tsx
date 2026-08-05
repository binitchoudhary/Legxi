import { Package, Globe2, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ShippingPanel() {
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <h3 className="font-semibold text-lg border-b pb-4">Shipping & Delivery</h3>
        
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <Globe2 className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Global Shipping</h4>
              <p className="text-sm text-muted-foreground mt-1">We ship worldwide via insured premium couriers (DHL, FedEx). Custom duties may apply based on destination.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Package className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Secure Packaging</h4>
              <p className="text-sm text-muted-foreground mt-1">Items are packed in custom climate-controlled security crates to ensure pristine condition upon arrival.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 sm:col-span-2">
            <Truck className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Dispatch Time</h4>
              <p className="text-sm text-muted-foreground mt-1">All lots are dispatched from our vault within 3-5 business days of settlement clearing.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
