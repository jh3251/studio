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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '../ui/skeleton';
import { Store } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Label } from '../ui/label';


const storeSchema = z.object({
  name: z.string().min(2, { message: 'Book name must be at least 2 characters.' }),
});
type StoreFormValues = z.infer<typeof storeSchema>;


export function StoreManager() {
  const { stores, addStore, updateStore, deleteStore, loading, activeStore, setActiveStore } = useAppContext();
  const { toast } = useToast();
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);


  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
  });

  const handleFormDialogOpen = (store: Store | null) => {
    setEditingStore(store);
    form.reset(store ? { name: store.name } : { name: '' });
    setIsFormDialogOpen(true);
  };
  
  const handleDeleteDialogOpen = (store: Store) => {
    if (stores.length <= 1) {
        toast({
            variant: "destructive",
            title: "Cannot Delete Last Book",
            description: "You must have at least one book.",
        });
        return;
    }
    setStoreToDelete(store);
    setIsDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setStoreToDelete(null);
    setDeletePassword('');
    setIsDeleteDialogOpen(false);
  }

  const onSubmit = async (data: StoreFormValues) => {
    try {
      if (editingStore) {
        await updateStore(editingStore.id, data);
        toast({ title: 'Book Updated', description: `Book "${data.name}" has been updated.` });
      } else {
        const newStoreId = await addStore(data);
        if (newStoreId) {
            await setActiveStore(newStoreId);
        }
        toast({ title: 'Book Added', description: `Book "${data.name}" has been added.` });
      }
      setIsFormDialogOpen(false);
      setEditingStore(null);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not save book.",
      });
    }
  };

  const handleDelete = async () => {
    if (deletePassword !== '12345') {
        toast({
            variant: "destructive",
            title: "Incorrect Password",
            description: "The password you entered is incorrect. Book not deleted.",
        });
        return;
    }
    if (!storeToDelete) return;

    setIsDeleting(true);
    try {
      await deleteStore(storeToDelete.id);
      toast({ title: 'Book Deleted', variant: 'destructive' });
      handleDeleteDialogClose();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not delete book.",
      });
    } finally {
        setIsDeleting(false);
    }
  };

  
  if (loading && stores.length === 0) {
      return (
          <Card>
              <CardHeader>
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-3">
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
                <CardTitle>Your Books</CardTitle>
                <CardDescription>Manage the financial books for your account.</CardDescription>
            </div>
            <Button onClick={() => handleFormDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Book
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stores.length > 0 ? (
            <ul className="space-y-3">
                {stores.map((store) => (
                    <li 
                    key={store.id}
                    className={cn(
                        "flex items-center gap-4 rounded-lg border p-4",
                        store.id === activeStore?.id ? "bg-accent border-primary" : "bg-card"
                    )}
                    >
                    <StoreIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="flex-1 font-medium">{store.name}</span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleFormDialogOpen(store)}>
                        <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={stores.length <= 1} onClick={() => handleDeleteDialogOpen(store)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    </li>
                ))}
            </ul>
        ) : (
          <div className="text-center text-muted-foreground py-16">
            <p className="font-medium">No books found.</p>
            <p className="text-sm mt-1">Add your first book to get started.</p>
          </div>
        )}
      </CardContent>
       {/* Add/Edit Dialog */}
        <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingStore ? 'Edit' : 'Add'} Book</DialogTitle>
                    <DialogDescription>
                        {editingStore ? 'Update the details for your book.' : 'Create a new financial book.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Book Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Personal Finances" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingStore ? 'Save Changes' : 'Create Book'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        This action cannot be undone. This will permanently delete the book <span className="font-bold">{`"${storeToDelete?.name}"`}</span> and all associated data. To confirm, please enter the password '12345'.
                    </DialogDescription>
                </DialogHeader>
                 <div className="space-y-4 py-2 pb-4">
                    <div className="space-y-2">
                        <Label htmlFor="delete-password">Password</Label>
                        <Input 
                            id="delete-password" 
                            type="password"
                            placeholder="Enter password to confirm"
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={handleDeleteDialogClose}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete Book
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
