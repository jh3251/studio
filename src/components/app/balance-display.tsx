'use client';

import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Wallet, User as UserIcon } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export function BalanceDisplay() {
  const { transactions, users, loading, activeStore, currency } = useAppContext();

  const { totalIncome, totalExpense, userBalances } = useMemo(() => {
    if (!activeStore) return { totalIncome: 0, totalExpense: 0, userBalances: [] };
      
    let totalIncome = 0;
    let totalExpense = 0;
    const userBalanceMap = new Map<string, { income: number; expense: number }>();
    
    const currentStoreUsers = users.filter(u => u.storeId === activeStore.id);
    currentStoreUsers.forEach(user => {
        userBalanceMap.set(user.name, { income: 0, expense: 0 });
    });

    const currentStoreTransactions = transactions.filter(t => t.storeId === activeStore.id);
    currentStoreTransactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        const currentUser = userBalanceMap.get(t.userName) || { income: 0, expense: 0 };
        userBalanceMap.set(t.userName, { ...currentUser, income: currentUser.income + t.amount });
      } else {
        totalExpense += t.amount;
        const currentUser = userBalanceMap.get(t.userName) || { income: 0, expense: 0 };
        userBalanceMap.set(t.userName, { ...currentUser, expense: currentUser.expense + t.amount });
      }
    });

    const userBalances = Array.from(userBalanceMap.entries()).map(([name, { income, expense }]) => ({
      name,
      balance: income - expense,
    }));

    return { totalIncome, totalExpense, userBalances };
  }, [transactions, users, activeStore]);

  const formatCurrency = (amount: number) => {
    if (currency === 'BDT') {
        return `৳${amount.toLocaleString('en-US')}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  if (loading && !activeStore) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px] col-span-1 md:col-span-2" />
        </div>
    )
  }

  if (!activeStore) {
      return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>No Store Selected</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">Please create or select a store to view its balance.</p>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="col-span-1 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalIncome - totalExpense)}</div>
            </CardContent>
        </Card>
        <Card className="col-span-1 md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="text-sm font-medium" />
            </CardHeader>
            <CardContent>
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-green-600 dark:text-green-500">Cash In:</span>
                        <span className="text-lg font-semibold">{formatCurrency(totalIncome)}</span>
                    </div>
                    <div className="text-muted-foreground mx-2">|</div>
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-red-600 dark:text-red-500">Cash Out:</span>
                        <span className="text-lg font-semibold">{formatCurrency(totalExpense)}</span>
                    </div>
                </div>
            </CardContent>
      </Card>
      {userBalances.map(user => (
        <Card key={user.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-bold">{user.name}</CardTitle>
                <UserIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className={cn(
                  "text-2xl font-bold",
                  user.balance > 0 && "text-green-600 dark:text-green-500",
                  user.balance < 0 && "text-red-600 dark:text-red-500",
                  user.balance === 0 && "text-muted-foreground"
                )}>
                  {formatCurrency(user.balance)}
                </div>
            </CardContent>
        </Card>
      ))}
    </div>
  );
}
