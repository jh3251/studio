'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/lib/types';

const transactionFormSchema = z.object({
  userName: z.string().min(1, 'User name is required.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface AddTransactionSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  transactionToEdit?: Transaction | null;
}

const formatDateForInput = (date: Date | string) => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  if (isNaN(d.getTime())) return '';
  // Format to YYYY-MM-DD
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function AddTransactionSheet({ isOpen, onOpenChange, transactionToEdit }: AddTransactionSheetProps) {
  const { categories, users, addTransaction, updateTransaction } = useAppContext();
  const { toast } = useToast();
  
  const isEditMode = !!transactionToEdit;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: 'expense',
      date: formatDateForInput(new Date()),
    },
  });

  useEffect(() => {
    if (isEditMode && transactionToEdit) {
      form.reset({
        ...transactionToEdit,
        date: formatDateForInput(transactionToEdit.date),
        categoryId: transactionToEdit.categoryId || undefined,
      });
    } else {
      form.reset({
        userName: '',
        amount: undefined,
        type: 'expense',
        date: formatDateForInput(new Date()),
        categoryId: undefined,
      });
    }
  }, [transactionToEdit, isEditMode, form, isOpen]);
  
  const transactionType = form.watch('type');

  const onSubmit = async (data: TransactionFormValues) => {
     if (data.type === 'expense' && !data.categoryId) {
      form.setError('categoryId', { type: 'manual', message: 'Please select a category for expenses.' });
      return;
    }
    
    try {
       // Convert the YYYY-MM-DD string to a full ISO string at UTC midnight
      const dateAsISOString = new Date(data.date).toISOString();

      if (isEditMode && transactionToEdit) {
        await updateTransaction({
          ...data,
          id: transactionToEdit.id,
          date: dateAsISOString,
          categoryId: data.type === 'expense' ? data.categoryId || '' : '',
        });
        toast({
          title: 'Transaction updated',
          description: `Transaction updated successfully.`,
        });
      } else {
        await addTransaction({
          ...data,
          date: dateAsISOString,
          categoryId: data.type === 'expense' ? data.categoryId || '' : '',
        });
        toast({
          title: 'Transaction added',
          description: `Transaction added successfully.`,
        });
      }
      
      onOpenChange(false);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: isEditMode ? "Could not update transaction." : "Could not add transaction.",
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEditMode ? 'Edit Transaction' : 'Add New Transaction'}</SheetTitle>
          <SheetDescription>{isEditMode ? 'Update the details of your transaction.' : 'Fill in the details to track your income or expense.'}</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                   <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                      disabled={isEditMode}
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">Cash Out</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">Cash In</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {transactionType === 'expense' && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Save Changes' : 'Save Transaction'}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
