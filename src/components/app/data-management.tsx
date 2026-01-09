'use client';

import { useState } from 'react';
import { Loader2, Download, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/context/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Transaction } from '@/lib/types';

export function DataManagement() {
  const { transactions, categories, addTransaction, activeStore, loading } = useAppContext();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const getCategoryName = (id: string | undefined) => {
    if (!id) return 'N/A';
    return categories.find(c => c.id === id)?.name || 'Uncategorized';
  };

  const handleExport = () => {
    if (!activeStore) {
        toast({
            variant: "destructive",
            title: "No Active Book",
            description: "Please select a book before exporting data.",
        });
        return;
    }
    setIsExporting(true);

    const dataToExport = transactions.map(t => ({
      id: t.id,
      date: t.date,
      user_name: t.userName,
      type: t.type,
      amount: t.amount,
      category: t.type === 'expense' ? getCategoryName(t.categoryId) : '',
    }));

    const csv = Papa.unparse(dataToExport);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const safeStoreName = activeStore.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `sumbook_transactions_${safeStoreName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setIsExporting(false);
    toast({
      title: 'Export Successful',
      description: 'Your transaction data has been exported to CSV.',
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setImportFile(event.target.files[0]);
    }
  };

  const handleImport = () => {
    if (!importFile) {
      toast({
        variant: "destructive",
        title: "No file selected",
        description: "Please select a CSV file to import.",
      });
      return;
    }

    if (!activeStore) {
        toast({
            variant: "destructive",
            title: "No Active Book",
            description: "Please select a book before importing data.",
        });
        return;
    }

    setIsImporting(true);

    Papa.parse(importFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const importedData = results.data as any[];
        const existingTransactionIds = new Set(transactions.map(t => t.id));
        let newTransactionsAdded = 0;
        
        for (const row of importedData) {
          try {
            if (!row.id || existingTransactionIds.has(row.id)) {
              continue; // Skip if no ID or if transaction already exists
            }

            if (!row.date || !row.user_name || !row.type || !row.amount) {
                console.warn("Skipping invalid row:", row);
                continue;
            }

            const category = categories.find(c => c.name === row.category);

            const transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'> = {
              userName: row.user_name,
              amount: parseFloat(row.amount),
              type: row.type as 'income' | 'expense',
              date: new Date(row.date).toISOString(),
              categoryId: row.type === 'expense' ? category?.id : undefined,
            };
            
            // We are not adding the ID, Firestore will generate one.
            // This is a simple import that adds new records.
            await addTransaction(transaction);
            newTransactionsAdded++;

          } catch (e) {
            console.error("Error processing row:", row, e);
          }
        }
        
        setIsImporting(false);
        setImportFile(null);
        toast({
          title: 'Import Complete',
          description: `${newTransactionsAdded} new transaction(s) were successfully imported.`,
        });
      },
      error: (error) => {
        setIsImporting(false);
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: `An error occurred while parsing the CSV file: ${error.message}`,
        });
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>Export your transaction data or import it from a CSV file.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
            <h4 className="font-medium">Export Transactions</h4>
            <p className="text-sm text-muted-foreground">Download all transactions from the currently active book as a CSV file.</p>
            <Button onClick={handleExport} disabled={isExporting || loading || transactions.length === 0}>
                {isExporting ? <Loader2 className="mr-2" /> : <Download className="mr-2" />}
                Export to CSV
            </Button>
        </div>
        <div className="space-y-4">
            <h4 className="font-medium">Import Transactions</h4>
            <p className="text-sm text-muted-foreground">Upload a CSV file to add transactions to the current book. Transactions that already exist will be skipped.</p>
            <div className="space-y-2">
                <Label htmlFor="import-file">CSV File</Label>
                <Input id="import-file" type="file" accept=".csv" onChange={handleFileChange} />
            </div>
            <Button onClick={handleImport} disabled={isImporting || loading || !importFile}>
                {isImporting ? <Loader2 className="mr-2" /> : <Upload className="mr-2" />}
                Import from CSV
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
