'use client';

import { useMemo } from 'react';
import { Wallet, User as UserIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
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
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
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
  
  const userBalanceChunks = [];
  for (let i = 0; i < userBalances.length; i += 2) {
    userBalanceChunks.push(userBalances.slice(i, i + 2));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(totalIncome - totalExpense)}</div>
            </CardContent>
        </Card>
        <Card>
            <CardContent className="p-4 space-y-3">
                 <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                        <span className="text-sm font-bold">Cash In</span>
                    </div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(totalIncome)}
                    </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                        <span className="text-sm font-bold">Cash Out</span>
                    </div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-500">
                        {formatCurrency(totalExpense)}
                    </div>
                </div>
            </CardContent>
        </Card>
      {userBalanceChunks.map((chunk, chunkIndex) => (
        <Card key={chunkIndex}>
            <CardContent className="p-4 space-y-3">
            {chunk.map((user, userIndex) => (
                <div key={user.name}>
                    {userIndex > 0 && <Separator className="my-2" />}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-bold">{user.name}</span>
                        </div>
                        <div className={cn(
                            "text-lg font-bold",
                            user.balance >= 0 && "text-green-600 dark:text-green-500",
                            user.balance < 0 && "text-red-600 dark:text-red-500"
                        )}>
                            {formatCurrency(user.balance)}
                        </div>
                    </div>
                </div>
            ))}
            </CardContent>
        </Card>
      ))}
    </div>
  );
}
