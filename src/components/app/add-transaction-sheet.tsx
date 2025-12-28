'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { useAppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';

const transactionFormSchema = z.object({
  userName: z.string().min(1, 'User name is required.'),
  description: z.string().min(2, 'Description must be at least 2 characters.'),
  amount: z.coerce.number().positive('Amount must be positive.'),
  type: z.enum(['income', 'expense']),
  categoryId: z.string().optional(),
  date: z.date(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface AddTransactionSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function AddTransactionSheet({ isOpen, onOpenChange }: AddTransactionSheetProps) {
  const { categories, users, addTransaction } = useAppContext();
  const { toast } = useToast();
  const { user } = useUser();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      description: '',
      type: 'expense',
      date: new Date(),
    },
  });
  
  const transactionType = form.watch('type');

  const onSubmit = async (data: TransactionFormValues) => {
     if (data.type === 'expense' && !data.categoryId) {
      form.setError('categoryId', { type: 'manual', message: 'Please select a category for expenses.' });
      return;
    }
    
    try {
      await addTransaction({
        ...data,
        categoryId: data.categoryId || '', // Ensure categoryId is not undefined
        date: data.date.toISOString(),
      });
      toast({
        title: 'Transaction added',
        description: `Successfully added "${data.description}".`,
      });
      form.reset({
        userName: '',
        description: '',
        type: 'expense',
        date: new Date(),
      });
      onOpenChange(false);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not add transaction.",
      });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add New Transaction</SheetTitle>
          <SheetDescription>Fill in the details to track your income or expense.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="userName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Groceries" {...field} />
                  </FormControl>
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
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="expense" />
                        </FormControl>
                        <FormLabel className="font-normal">Expense</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="income" />
                        </FormControl>
                        <FormLabel className="font-normal">Income</FormLabel>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                <FormItem className="flex flex-col">
                  <FormLabel>Transaction Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Transaction
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
