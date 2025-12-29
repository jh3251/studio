'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Edit, Trash2, Loader2, Eraser, MoreVertical, FileDown } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AddTransactionSheet } from './add-transaction-sheet';
import type { Transaction } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

export function RecentTransactions() {
  const { transactions, categories, deleteTransaction, clearAllTransactions, activeStore, currency, financialSummary } = useAppContext();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsSheetOpen(true);
  };
  
  const handleDelete = async (transaction: Transaction) => {
    try {
      await deleteTransaction(transaction.id, transaction.type);
      toast({
        title: 'Transaction Deleted',
        description: `Transaction deleted successfully.`,
        variant: 'destructive'
      });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not delete transaction.",
      });
    }
  };

  const handleClearAll = async () => {
    if (password !== '12345') {
      toast({
        variant: "destructive",
        title: "Incorrect Password",
        description: "The password you entered is incorrect. Data was not cleared.",
      });
      return;
    }
    setIsClearing(true);
    try {
      await clearAllTransactions();
      toast({
        title: 'All Data Cleared',
        description: 'All transaction history has been permanently deleted.',
        variant: 'destructive',
      });
      setIsClearAllDialogOpen(false);
      setPassword('');
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not clear all transactions.",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSheetOpenChange = (isOpen: boolean) => {
    setIsSheetOpen(isOpen);
    if (!isOpen) {
      setEditingTransaction(null);
    }
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || 'Uncategorized';
  };

  const formatCurrency = (amount: number) => {
    if (currency === 'BDT') {
        return `৳${amount.toLocaleString('en-US')}`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };
  
  const sortedTransactions = activeStore 
    ? [...transactions]
        .filter(t => t.storeId === activeStore.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const handleExportPDF = () => {
    if (!activeStore) return;
    
    const doc = new jsPDF();

    const formatCurrencyForPDF = (amount: number) => {
        // Using currency code instead of symbol to avoid rendering issues
        if (currency === 'BDT') {
            return `${amount.toLocaleString('en-US')} BDT`;
        }
         const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
        }).format(amount);
        // Replace symbol with code
        return formatted.replace(/[\$\€\¥\£\৳]/, currency + ' ');
    };
    
    const title = `Transaction Report for ${activeStore.name}`;
    const date = `Generated on: ${new Date().toLocaleDateString()}`;
    let finalY = 0;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(date, 14, 30);
    
    // Summary Section
    doc.setFontSize(14);
    doc.text("Financial Summary", 14, 40);
    
    const summaryBody: (string|number)[][] = [
      ["Total Balance", formatCurrencyForPDF(financialSummary.totalBalance)],
      ["Total Cash In", formatCurrencyForPDF(financialSummary.totalIncome)],
      ["Total Cash Out", formatCurrencyForPDF(financialSummary.totalExpense)],
    ];

    autoTable(doc, {
      body: summaryBody,
      startY: 45,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        1: { halign: 'right' }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // User Balances
    if (financialSummary.userBalances.length > 0) {
      doc.setFontSize(14);
      doc.text("User Balances", 14, finalY);
      
      const userBalanceBody = financialSummary.userBalances.map(ub => [
        ub.name,
        formatCurrencyForPDF(ub.balance),
      ]);

      autoTable(doc, {
        head: [["User", "Balance"]],
        body: userBalanceBody,
        startY: finalY + 5,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }, // A blue color
        styles: { fontSize: 10, cellPadding: 2 },
        columnStyles: {
          1: { halign: 'right' }
        }
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    }


    // Transaction Table
    const tableColumn = ["Date", "User", "Details", "Amount"];
    const tableRows: (string|number)[][] = [];

    sortedTransactions.forEach(t => {
      const transactionData = [
        new Date(t.date).toLocaleDateString(),
        t.userName,
        t.type === 'income' ? 'Cash In' : getCategoryName(t.categoryId),
        `${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('en-US')} ${currency}`,
      ];
      tableRows.push(transactionData);
    });
    
    doc.setFontSize(14);
    doc.text("Transaction History", 14, finalY);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: finalY + 5,
      headStyles: { fillColor: [22, 163, 74] }, // Green color for header
      styles: { halign: 'center' },
      columnStyles: {
        3: { halign: 'right' }
      }
    });

    doc.save(`transactions-${activeStore.name.toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-center">
            {sortedTransactions.length > 0 && (
              <div className="flex items-center gap-2">
                 <Button size="sm" onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" /> Export to PDF
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setIsClearAllDialogOpen(true)}>
                  <Eraser className="mr-2 h-4 w-4" /> Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
            <div className="min-h-[400px]">
                 {!activeStore ? (
                    <div className="flex items-center justify-center h-24 text-center text-muted-foreground">
                        Please select a store to see transactions.
                    </div>
                ) : sortedTransactions.length > 0 ? (
                    <div className="space-y-4">
                    {sortedTransactions.map((t, index) => (
                       <div key={t.id} className={cn("p-4 rounded-lg border", index % 2 === 0 ? 'bg-card' : 'bg-accent/50')}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <div className="font-bold text-lg">{t.userName}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                    {t.type === 'expense' ? (
                                        <Badge variant="outline" className="text-red-600 border-red-600/40">{getCategoryName(t.categoryId)}</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-green-600 border-green-600/40">Cash In</Badge>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(t.date).toLocaleDateString()}
                                    </div>
                                    </div>
                                </div>
                            </div>
                             <div className="flex items-center gap-2">
                                <div
                                    className={cn(
                                    'text-right font-semibold text-lg',
                                    t.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                    )}
                                >
                                    {t.type === 'income' ? '+' : '-'}
                                    {formatCurrency(t.amount)}
                                </div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Actions</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleEdit(t)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive focus:bg-destructive/10" role="menuitem">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </div>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete this transaction.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => handleDelete(t)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                                Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                       </div>
                    ))}
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-24 text-center text-muted-foreground">
                        No transactions yet for this store.
                    </div>
                )}
          </div>
        </CardContent>
      </Card>
      
      <AddTransactionSheet 
        isOpen={isSheetOpen} 
        onOpenChange={handleSheetOpenChange}
        transactionToEdit={editingTransaction}
      />

      <Dialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Clear All Transaction Data for this Store</DialogTitle>
            <DialogDescription>
              This is a destructive action and cannot be undone. To confirm, please enter the password '12345'.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 pb-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="Enter password to confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleClearAll} disabled={isClearing}>
              {isClearing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete All Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

    