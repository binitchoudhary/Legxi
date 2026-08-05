'use client';

import * as React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../store/authStore';

export function AccessDenied() {
  const user = useAuthStore((state) => state.user);

  const homeHref = user?.roles.includes('ADMIN')
    ? '/admin/dashboard'
    : user?.roles.includes('BIDDER')
    ? '/user/dashboard'
    : '/';

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-full border border-destructive/30 bg-destructive/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
        <ShieldAlert className="w-10 h-10 text-destructive" />
      </div>

      <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-tight">
        Access Restricted
      </h1>

      <p className="text-white/60 text-sm max-w-md mb-8 font-light leading-relaxed">
        Your current account role does not have authorization to view this section of the vault.
      </p>

      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="border-white/10 text-white hover:bg-white/10 gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Button>

        <Button asChild className="gap-2 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
          <Link href={homeHref}>
            <Home className="w-4 h-4" /> Return to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
