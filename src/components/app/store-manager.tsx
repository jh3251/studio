'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon } from 'lucide-react';

import { useAppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '../ui/skeleton';
import { Store } from '@/lib/types';
import { cn } from '@/lib/utils';

const storeSchema = z.object({
  name: z.string().min(2, { message: 'Store name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});
type StoreFormValues = z.infer<typeof storeSchema>;


export function StoreManager() {
  const { stores, addStore, updateStore, deleteStore, loading, activeStore, setActiveStore } = useAppContext();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
  });

  const handleDialogOpen = (store: Store | null) => {
    setEditingStore(store);
    form.reset(store ? { name: store.name, email: store.email, password: store.password } : { name: '', email: '', password: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: StoreFormValues) => {
    try {
      if (editingStore) {
        await updateStore({ id: editingStore.id, ...data });
        toast({ title: 'Store Updated', description: `Store "${data.name}" has been updated.` });
      } else {
        await addStore(data);
        toast({ title: 'Store Added', description: `Store "${data.name}" has been added.` });
      }
      setIsDialogOpen(false);
      setEditingStore(null);
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "Could not save store.",
      });
    }
  };

  const handleDelete = async (id: string, email: string) => {
    try {
      await deleteStore(id, email);
      toast({ title: 'Store Deleted', variant: 'destructive' });
    } catch (error: any) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: error.message || "Could not delete store.",
      });
    }
  };
  
  if (loading) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Your Stores</CardTitle>
                <CardDescription>Manage stores and their dedicated login credentials.</CardDescription>
            </div>
            <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Store
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stores.length > 0 ? (
          <ul className="space-y-3">
            {stores.map((store) => {
              const isActive = activeStore?.id === store.id;
              return (
                <li key={store.id} className={cn("flex items-center gap-4 rounded-lg border p-4 transition-colors", isActive && "bg-accent")}>
                  <StoreIcon className="h-6 w-6 text-muted-foreground" />
                  <div className="flex-1">
                    <span className="font-medium">{store.name}</span>
                     <p className="text-sm text-muted-foreground">{store.email}</p>
                    {isActive && <span className="ml-2 text-xs font-semibold text-primary">(Active)</span>}
                  </div>
                  {!isActive && (
                    <Button variant="outline" size="sm" onClick={() => setActiveStore(store)}>
                      Set Active
                    </Button>
                  )}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDialogOpen(store)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete this store, its login credentials, and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(store.id, store.email)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-16">
            <p className="font-medium">No stores found.</p>
            <p className="text-sm mt-1">Add your first store to get started.</p>
          </div>
        )}
      </CardContent>
       {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingStore ? 'Edit' : 'Add'} Store</DialogTitle>
                    <DialogDescription>
                        {editingStore ? 'Update the details for your store.' : 'Create a new store and its dedicated login credentials.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Personal Budget" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Login Email</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="store.login@example.com" {...field} disabled={!!editingStore} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Login Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingStore ? 'Save Changes' : 'Create Store'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
