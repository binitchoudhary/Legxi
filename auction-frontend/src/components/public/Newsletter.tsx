import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Newsletter() {
  return (
    <section className="w-full py-16 md:py-24 bg-primary/5 border-y border-border">
      <div className="container mx-auto px-4 text-center max-w-2xl space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">Never Miss a Drop</h2>
        <p className="text-muted-foreground text-lg">
          Subscribe to our newsletter to receive exclusive alerts on upcoming premium auctions and private sales.
        </p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mt-8">
          <Input 
            type="email" 
            placeholder="Enter your email address" 
            className="bg-background h-12"
            required
          />
          <Button type="submit" size="lg" className="h-12 w-full sm:w-auto shrink-0">
            Subscribe
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-4">
          By subscribing you agree to our Privacy Policy. You can unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
