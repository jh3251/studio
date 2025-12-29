'use client';

import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Edit, Trash2, Loader2, Eraser, MoreVertical, FileDown } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  const { transactions, categories, deleteTransaction, clearAllTransactions, activeStore, currency } = useAppContext();
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
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const handleExportPDF = () => {
    if (!activeStore) return;
    
    const doc = new jsPDF();
    const title = `Transaction Report for ${activeStore.name}`;
    const date = `Generated on: ${new Date().toLocaleDateString()}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.text(date, 14, 30);

    const tableColumn = ["Date", "User", "Details", "Amount"];
    const tableRows: (string|number)[][] = [];

    sortedTransactions.forEach(t => {
      const transactionData = [
        new Date(t.date).toLocaleDateString(),
        t.userName,
        t.type === 'income' ? 'Cash In' : getCategoryName(t.categoryId),
        `${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}`,
      ];
      tableRows.push(transactionData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
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
          <div className="flex items-center justify-end">
            {sortedTransactions.length > 0 && (
              <div className="flex items-center gap-2">
                 <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <FileDown className="mr-2 h-4 w-4" /> Export to PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => setIsClearAllDialogOpen(true)}>
                  <Eraser className="mr-2 h-4 w-4" /> Clear All
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
            <div className="min-h-[400px]">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead className="hidden sm:table-cell">Details</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[40px] text-right">
                        <span className="sr-only">Actions</span>
                    </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {!activeStore ? (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                            Please select a store to see transactions.
                            </TableCell>
                        </TableRow>
                    ) : sortedTransactions.length > 0 ? (
                    sortedTransactions.map(t => (
                        <TableRow key={t.id}>
                        <TableCell>
                            <div className="font-bold text-lg">{t.userName}</div>
                            <div className="text-sm text-muted-foreground sm:hidden">
                                {new Date(t.date).toLocaleDateString()}
                            </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                            {t.type === 'expense' ? (
                                <Badge variant="outline" className="text-red-600 border-red-600/40">{getCategoryName(t.categoryId)}</Badge>
                            ) : (
                                <Badge variant="outline" className="text-green-600 border-green-600/40">Cash In</Badge>
                            )}
                             <div className="text-xs text-muted-foreground mt-1">
                                {new Date(t.date).toLocaleDateString()}
                            </div>
                        </TableCell>
                        <TableCell
                            className={cn(
                            'text-right font-semibold',
                            t.type === 'income' ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                            )}
                        >
                            {t.type === 'income' ? '+' : '-'}
                            {formatCurrency(t.amount)}
                        </TableCell>
                        <TableCell className="text-right">
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
                        </TableCell>
                        </TableRow>
                    ))
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                        No transactions yet for this store.
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
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
