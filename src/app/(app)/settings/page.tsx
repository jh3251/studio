'use client';

import { AccountSettings } from '@/components/app/account-settings';
import { StoreManager } from '@/components/app/store-manager';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your account and book settings.</p>
        </div>
      </div>
      <div className="space-y-8">
        <StoreManager />
        <AccountSettings />
      </div>
    </div>
  );
}
