import { ShieldCheck, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function AuthenticationPanel() {
  return (
    <Card className="bg-muted/30 border-primary/20">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="bg-primary/10 p-3 rounded-full shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
              LEGXI Certified Authentic
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Every item sold on our platform undergoes a rigorous multi-point inspection by independent authenticators. 
              Winning bidders receive a cryptographic Certificate of Authenticity permanently recorded on our registry.
            </p>
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <Info className="w-3 h-3" />
              <span>Learn more about our authentication process</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
