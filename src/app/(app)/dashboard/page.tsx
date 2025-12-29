'use client';

import { DashboardClient } from '@/components/app/dashboard-client';
import { NewTransactionButton } from '@/components/app/new-transaction-button';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Get a quick overview of your financial status.</p>
        </div>
        <NewTransactionButton />
      </div>
      <DashboardClient />
    </div>
  );
}
