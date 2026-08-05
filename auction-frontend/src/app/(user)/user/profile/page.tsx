'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { ProfileCard } from '@/features/profile/components/ProfileCard';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Mail, Shield, Key } from 'lucide-react';
import { StatusBadge } from '@/components/admin/StatusBadge';

export default function UserProfilePage() {
  const { user } = useAuthStore();

  return (
    <PageContainer>
      <PageHeader 
        title="Profile" 
        description="View your personal information and account status."
      />

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <ProfileCard className="text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">{user?.email}</h3>
            <p className="text-sm text-muted-foreground mb-4">ID: {user?.id}</p>
            <div className="flex justify-center gap-2">
              {user?.roles.map(r => (
                <StatusBadge key={r} status={r} variant="secondary" className="text-xs" />
              ))}
            </div>
          </ProfileCard>
        </div>

        <div className="md:col-span-2 space-y-6">
          <ProfileCard title="Personal Information" description="Your profile details are currently read-only.">
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={user?.email || ''} readOnly className="pl-9 bg-muted/50 cursor-not-allowed" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Account ID</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value={user?.id || ''} readOnly className="pl-9 font-mono text-sm bg-muted/50 cursor-not-allowed" />
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Verification Status</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input value="Verified" readOnly className="pl-9 bg-muted/50 cursor-not-allowed text-emerald-600 font-medium" />
                </div>
              </div>
            </div>
          </ProfileCard>
        </div>
      </div>
    </PageContainer>
  );
}
