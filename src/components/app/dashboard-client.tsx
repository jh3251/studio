'use client';

import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BalanceDisplay } from '@/components/app/balance-display';
import { AddTransactionSheet } from '@/components/app/add-transaction-sheet';
import { RecentTransactions } from '@/components/app/recent-transactions';

export function DashboardClient() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <BalanceDisplay />
        <Button onClick={() => setIsSheetOpen(true)}>
          <PlusCircle />
          New Transaction
        </Button>
      </div>

      <RecentTransactions />
      <AddTransactionSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </div>
  );
}
