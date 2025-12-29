'use client';

import { DashboardClient } from '@/components/app/dashboard-client';
import { NewTransactionButton } from '@/components/app/new-transaction-button';
import { ThemeToggle } from '@/components/theme-toggle';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <NewTransactionButton />
        <ThemeToggle />
      </div>
      <DashboardClient />
    </div>
  );
}
