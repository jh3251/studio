'use client';

import { BalanceDisplay } from '@/components/app/balance-display';
import { RecentTransactions } from '@/components/app/recent-transactions';

export function DashboardClient() {
  return (
    <div className="space-y-6">
      <BalanceDisplay />
      <RecentTransactions />
    </div>
  );
}
