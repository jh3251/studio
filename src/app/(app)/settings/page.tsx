import { AccountSettings } from '@/components/app/account-settings';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings.</p>
      </div>
      <AccountSettings />
    </div>
  );
}
