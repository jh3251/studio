'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Edit, Trash2, Loader2, Store as StoreIcon, GripVertical } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

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
import { useRouter } from 'next/navigation';

const storeSchema = z.object({
  name: z.string().min(2, { message: 'Store name must be at least 2 characters.' }),
});
type StoreFormValues = z.infer<typeof storeSchema>;


export function StoreManager() {
  const { stores, addStore, updateStore, deleteStore, loading, setActiveStore, updateStoreOrder } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
  });

  const handleDialogOpen = (store: Store | null) => {
    setEditingStore(store);
    form.reset(store ? { name: store.name } : { name: '' });
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
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not save store.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteStore(id);
      toast({ title: 'Store Deleted', variant: 'destructive' });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not delete store.",
      });
    }
  };
  
  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(stores);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateStoreOrder(items);
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

  const handleSelectStore = (store: Store) => {
    setActiveStore(store);
    router.push('/dashboard');
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Your Stores</CardTitle>
                <CardDescription>Manage and reorder the stores for your finances.</CardDescription>
            </div>
            <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Store
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {stores.length > 0 ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="stores">
              {(provided) => (
                <ul {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                  {stores.map((store, index) => (
                    <Draggable key={store.id} draggableId={store.id} index={index}>
                      {(provided) => (
                        <li 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className="flex items-center gap-4 rounded-lg border bg-card p-4"
                        >
                          <div {...provided.dragHandleProps} className="cursor-grab">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <StoreIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="flex-1 font-medium">{store.name}</span>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => handleSelectStore(store)}>
                                Go to Store
                            </Button>
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
                                    This action cannot be undone. This will permanently delete the store and all associated data (transactions, users, categories).
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(store.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </li>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
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
                        {editingStore ? 'Update the details for your store.' : 'Create a new store to track finances separately.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Store Name</FormLabel>
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
                                {editingStore ? 'Save Changes' : 'Create Store'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>        </Dialog>
    </Card>
  );
}
