'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ImageResolver } from '@/components/public/ImageResolver';

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const body = await response.json();
        setAuth({
          id: body.user?.id || '1',
          email: body.user?.email || data.email,
          roles: [body.role || 'USER']
        });
        toast.success("Successfully logged in.");
        router.push(body.role === 'ADMIN' ? '/admin/dashboard' : '/user/dashboard');
      } else {
        toast.error("Invalid credentials.");
      }
    } catch {
      toast.error("An error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      
      {/* Left Screen: Cinematic Imagery */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 border-r border-white/5 overflow-hidden">
         <ImageResolver 
           src={null} 
           alt="LEGXI Vault"
           className="opacity-40 hover:scale-105 transition-transform duration-[10s]"
           priority
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/40 to-transparent"></div>
         
         <div className="relative z-10 pt-8">
            <Link href="/" className="inline-flex items-center text-xs font-bold tracking-[0.2em] uppercase text-white/50 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4 mr-3" /> Back to Vault
            </Link>
         </div>

         <div className="relative z-10 pb-8">
            <h2 className="text-4xl font-serif text-white mb-4 leading-tight">
               Secure Your <br/>
               <span className="italic text-primary">Legacy.</span>
            </h2>
            <p className="text-white/60 font-light max-w-md">
               Join the world&apos;s most exclusive network of sports memorabilia collectors. Verified authentic. Cryptographically secured.
            </p>
         </div>
      </div>

      {/* Right Screen: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 xl:p-24 relative overflow-hidden">
        
        {/* Subtle glow behind form */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          
          <div className="text-center mb-12">
             <div className="mx-auto w-16 h-16 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center mb-6 shadow-[0_0_15px_rgba(212,175,55,0.15)]">
               <span className="font-serif text-2xl font-bold tracking-tighter text-primary">L</span>
             </div>
             <h1 className="text-3xl font-serif text-white tracking-tight mb-2">Access Portal</h1>
             <p className="text-white/40 text-sm font-light">Enter your credentials to continue</p>
          </div>
          
          {/* SSO Buttons */}
          <div className="flex gap-4 mb-8">
             <Button variant="outline" type="button" className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 font-medium">
               Google
             </Button>
             <Button variant="outline" type="button" className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 font-medium">
               Apple
             </Button>
          </div>
          
          <div className="flex items-center mb-8">
             <div className="flex-1 h-px bg-white/10"></div>
             <span className="px-4 text-xs text-white/30 uppercase tracking-[0.2em]">Or</span>
             <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            <div className="space-y-3">
              <Label htmlFor="email" className="text-xs uppercase tracking-widest text-white/50">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="name@example.com"
                {...register("email")}
                className={`h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 ${errors.email ? "border-destructive" : ""}`}
              />
              {errors.email && (
                <p className="text-xs text-destructive font-medium mt-1">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-widest text-white/50">Password</Label>
                <a href="#" className="text-xs font-medium text-primary hover:text-white transition-colors">Forgot password?</a>
              </div>
              <Input 
                id="password" 
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className={`h-14 bg-white/5 border-white/10 text-white placeholder:text-white/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 ${errors.password ? "border-destructive" : ""}`}
              />
              {errors.password && (
                <p className="text-xs text-destructive font-medium mt-1">{errors.password.message}</p>
              )}
            </div>
            
            <Button type="submit" className="w-full h-14 text-sm uppercase tracking-widest font-bold mt-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
            
            <div className="text-center text-sm text-white/40 pt-6">
              Don&apos;t have an account? <a href="#" className="font-semibold text-primary hover:text-white transition-colors ml-1">Register</a>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
