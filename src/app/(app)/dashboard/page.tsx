'use client';

import { DashboardClient } from '@/components/app/dashboard-client';
import { NewTransactionButton } from '@/components/app/new-transaction-button';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
       <div className="flex justify-between items-center">
        <NewTransactionButton />
        <div />
      </div>
      <DashboardClient />
    </div>
  );
}
