
'use client';

import { Wallet, User as UserIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Separator } from '../ui/separator';

export function BalanceDisplay() {
  const { loading, currency, financialSummary } = useAppContext();
  const { totalIncome, totalExpense, totalBalance, userBalances } = financialSummary;

  const formatCurrency = (amount: number) => {
    if (currency === 'BDT') {
        return `৳${amount.toLocaleString('en-US')}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  if (loading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
            <Skeleton className="h-[126px]" />
        </div>
    )
  }

  const userBalanceChunks = [];
  for (let i = 0; i < userBalances.length; i += 2) {
    userBalanceChunks.push(userBalances.slice(i, i + 2));
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="animate-in fade-in slide-in-from-bottom-5 duration-500">
            <CardHeader className="flex flex-row items-center justify-center gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Balance</CardTitle>
                <Wallet className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent className="text-center">
                <div className="text-4xl font-bold text-primary">{formatCurrency(totalBalance)}</div>
            </CardContent>
        </Card>
        <Card className="animate-in fade-in slide-in-from-bottom-5 duration-500" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-4 space-y-3">
                 <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ArrowUpCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                        <span className="text-sm font-bold">Total Cash In</span>
                    </div>
                    <div className="text-lg font-bold text-green-600 dark:text-green-500">
                        {formatCurrency(totalIncome)}
                    </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <ArrowDownCircle className="h-4 w-4 text-red-600 dark:text-red-500" />
                        <span className="text-sm font-bold">Total Cash Out</span>
                    </div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-500">
                        {formatCurrency(totalExpense)}
                    </div>
                </div>
            </CardContent>
        </Card>
      {userBalanceChunks.map((chunk, chunkIndex) => (
        <Card key={chunkIndex} className="animate-in fade-in slide-in-from-bottom-5 duration-500" style={{ animationDelay: `${200 + chunkIndex * 100}ms` }}>
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
