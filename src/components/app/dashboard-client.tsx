'use client';

import { BalanceDisplay } from '@/components/app/balance-display';
import { RecentTransactions } from '@/components/app/recent-transactions';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '../ui/button';

export function DashboardClient() {
  const { activeStore, loading } = useAppContext();

  if (!loading && !activeStore) {
    return (
      <Card className="text-center py-16">
        <CardHeader>
          <CardTitle className="text-2xl font-bold font-headline">Welcome to SumBook</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6">Create a store to start managing your finances.</p>
          <Button asChild>
            <Link href="/stores">Create Your First Store</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <BalanceDisplay />
      <RecentTransactions />
    </div>
  );
}
