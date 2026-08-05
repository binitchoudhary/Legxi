'use client';

import * as React from 'react';
import { PageContainer } from '@/components/admin/PageContainer';
import { PageHeader } from '@/components/admin/PageHeader';
import { SettingsCard } from '@/features/account/components/SettingsCard';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PreferencesPage() {
  return (
    <PageContainer>
      <PageHeader 
        title="Preferences" 
        description="Manage your workspace settings and preferences."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <SettingsCard title="Application Theme" description="Customize your visual experience (Disabled for RC1)">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Dark Mode</Label>
              <Switch disabled />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-muted-foreground">Compact Density</Label>
              <Switch disabled />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard title="Localization" description="Language and region settings (Disabled for RC1)">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Language</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="English (US)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English (US)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Timezone</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="UTC+05:30 (IST)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ist">UTC+05:30 (IST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SettingsCard>
      </div>
    </PageContainer>
  );
}
