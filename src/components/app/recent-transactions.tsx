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
import { useUser } from '@/firebase';

export function RecentTransactions() {
  const { transactions, categories, deleteTransaction, clearAllTransactions, currency, address, financialSummary } = useAppContext();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const { toast } = useToast();
  const { user: authUser } = useUser();


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
  
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    let finalY = 0;

    const primaryColor = [34, 113, 233]; 
    const mutedColor = [100, 116, 139];
    const whiteColor = [255, 255, 255];
    const redColor = [220, 38, 38];
    const greenColor = [22, 163, 74];
    
    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    // Sumbook Logo (drawn manually)
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setDrawColor(whiteColor[0], whiteColor[1], whiteColor[2]);
    doc.setLineWidth(1.5);
    // Bounding box for logo
    doc.roundedRect(14, 10, 15, 15, 2, 2, 'FD'); // Fill with primary, draw with white
    doc.setDrawColor(whiteColor[0], whiteColor[1], whiteColor[2]);
    // Dollar sign
    doc.path([
        {op: 'm', x: 21.5, y: 12.5},
        {op: 'l', x: 21.5, y: 22.5},
    ]).stroke();
    doc.path([
        {op: 'm', x: 24, y: 15},
        {op: 'c', x1: 24, y1: 14, x2: 23, y2: 14, x: 22.5, y: 14},
        {op: 'l', x: 20, y: 14},
        {op: 'c', x1: 19, y1: 14, x2: 19, y2: 15, x: 19, y: 15.5},
        {op: 'l', x: 19, y: 17.5},
        {op: 'c', x1: 19, y1: 18.5, x2: 20, y2: 18.5, x: 20.5, y: 18.5},
        {op: 'l', x: 23, y: 18.5},
        {op: 'c', x1: 24, y1: 18.5, x2: 24, y2: 19.5, x: 24, y: 20},
        {op: 'l', x: 24, y: 21.5},
        {op: 'c', x1: 24, y1: 22.5, x2: 23, y2: 22.5, x: 22.5, y: 22.5},
        {op: 'l', x: 20, y: 22.5},
    ]).stroke();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(whiteColor[0], whiteColor[1], whiteColor[2]);
    doc.text('Financial Report', 34, 18);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    let userDetailsY = 15;
    if (authUser?.displayName) {
        doc.text(authUser.displayName, pageWidth - 14, userDetailsY, { align: 'right' });
        userDetailsY += 6;
    }
    if (address) {
        const addressLines = doc.splitTextToSize(address, 60);
        doc.text(addressLines, pageWidth - 14, userDetailsY, { align: 'right' });
    }

    finalY = 45;

    const formatCurrencyForPDF = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency,
            currencyDisplay: 'symbol'
        }).format(amount);
    };
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text("Summary", 14, finalY);
    finalY += 2;

    const summaryBody = [
        ['Balance', formatCurrencyForPDF(financialSummary.totalBalance)],
        ['Total Cash In', formatCurrencyForPDF(financialSummary.totalIncome)],
        ['Total Cash Out', formatCurrencyForPDF(financialSummary.totalExpense)],
    ];
    autoTable(doc, {
        body: summaryBody,
        startY: finalY,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3, lineWidth: 0.1, lineColor: [221, 221, 221] },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 0) {
              data.cell.styles.fillColor = [248, 250, 252]; 
            }
        }
    });
    finalY = (doc as any).lastAutoTable.finalY + 15;
    
    if (financialSummary.userBalances.length > 0) {
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text("User Balances", 14, finalY);
      finalY += 2;

      const userBalanceBody = financialSummary.userBalances.map(ub => [
        ub.name,
        formatCurrencyForPDF(ub.balance),
      ]);

      autoTable(doc, {
        head: [["User", "Balance"]],
        body: userBalanceBody,
        startY: finalY,
        theme: 'striped',
        headStyles: { fillColor: [63, 63, 70], fontStyle: 'bold' }, 
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          1: { halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const rawValue = financialSummary.userBalances[data.row.index].balance;
                data.cell.styles.textColor = rawValue >= 0 ? greenColor : redColor;
            }
        }
      });
      finalY = (doc as any).lastAutoTable.finalY + 15;
    }

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text("Transaction History", 14, finalY);
    finalY += 2;

    const tableColumn = ["Date", "User", "Details", "Amount"];
    const tableRows: (string|number)[][] = [];
    sortedTransactions.forEach(t => {
      const transactionData = [
        new Date(t.date).toLocaleDateString('en-GB'),
        t.userName,
        t.type === 'income' ? 'Cash In' : getCategoryName(t.categoryId),
        `${t.type === 'income' ? '+' : '-'}${t.amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
      ];
      tableRows.push(transactionData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: finalY,
      theme: 'grid',
      headStyles: { fillColor: primaryColor, fontStyle: 'bold' },
      styles: { fontSize: 10, cellPadding: 3, lineWidth: 0.1, lineColor: [221, 221, 221] },
      columnStyles: {
        3: { halign: 'right' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
            const transaction = sortedTransactions[data.row.index];
            data.cell.styles.textColor = transaction.type === 'income' ? greenColor : redColor;
            data.cell.styles.fontStyle = 'bold';
        }
      }
    });

    finalY = (doc as any).lastAutoTable.finalY;

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(mutedColor[0], mutedColor[1], mutedColor[2]);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text('SumBook | Your Financial Companion', 14, pageHeight - 10);
    }
    
    doc.save(`SumBook-Report-${new Date().toISOString().split('T')[0]}.pdf`);
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
                 {sortedTransactions.length > 0 ? (
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
                                        {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
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
                        No transactions yet. Add one to get started.
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
            <DialogTitle>Clear All Transaction Data</DialogTitle>
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
