'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PlusCircle, Edit, Trash2, Loader2, GripVertical, User as UserIcon } from 'lucide-react';

import { useAppContext } from '@/context/app-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
  DialogTrigger,
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
import { User } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(2, { message: 'User name must be at least 2 characters.' }),
});
type UserFormValues = z.infer<typeof userSchema>;


export function UserManager() {
  const { users, addUser, updateUser, deleteUser, loading } = useAppContext();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
  });

  const handleDialogOpen = (user: User | null) => {
    setEditingUser(user);
    form.reset(user ? { name: user.name } : { name: '' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (editingUser) {
        await updateUser({ id: editingUser.id, userId: editingUser.userId, ...data });
        toast({ title: 'User Updated', description: `User "${data.name}" has been updated.` });
      } else {
        await addUser(data);
        toast({ title: 'User Added', description: `User "${data.name}" has been added.` });
      }
      setIsDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not save user.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteUser(id);
      toast({ title: 'User Deleted', variant: 'destructive' });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not delete user.",
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
              <CardContent className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
              </CardContent>
          </Card>
      );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
            <div>
                <CardTitle>Your Users</CardTitle>
                <CardDescription>Manage the users for your transactions.</CardDescription>
            </div>
            <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add User
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {users.length > 0 ? (
          <ul className="space-y-2">
            {users.map((user) => {
              return (
                <li key={user.id} className="flex items-center gap-4 rounded-lg border p-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 font-medium">{user.name}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the user and may affect transactions associated with it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(user.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            <p>No users found.</p>
            <p className="text-sm">Add your first user to get started.</p>
          </div>
        )}
      </CardContent>
       {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingUser ? 'Edit' : 'Add'} User</DialogTitle>
                    <DialogDescription>
                        {editingUser ? 'Update the details for your user.' : 'Create a new user for your transactions.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>User Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., John Doe" {...field} />
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
                                {editingUser ? 'Save Changes' : 'Create User'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
