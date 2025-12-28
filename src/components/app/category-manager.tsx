'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Lucide from 'lucide-react';
import { PlusCircle, Edit, Trash2, Loader2, GripVertical, Ban } from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '../ui/skeleton';
import { Category } from '@/lib/types';

const iconNames = [
  'ShoppingCart', 'Utensils', 'Home', 'Car', 'HeartPulse', 'BookOpen', 'Gift', 'Plane',
  'Film', 'Briefcase', 'GraduationCap', 'PawPrint', 'Receipt', 'PiggyBank'
] as const;

type IconName = typeof iconNames[number];

const categorySchema = z.object({
  name: z.string().min(2, { message: 'Category name must be at least 2 characters.' }),
  icon: z.enum(iconNames),
});
type CategoryFormValues = z.infer<typeof categorySchema>;

const getIconComponent = (iconName: IconName | string | undefined) => {
    if (!iconName || !iconNames.includes(iconName as IconName)) return Ban;
    return Lucide[iconName as IconName] || Ban;
};

export function CategoryManager() {
  const { categories, addCategory, updateCategory, deleteCategory, loading } = useAppContext();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
  });

  const handleDialogOpen = (category: Category | null) => {
    setEditingCategory(category);
    form.reset(category ? { name: category.name, icon: category.icon as IconName } : { name: '', icon: 'ShoppingCart' });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      if (editingCategory) {
        await updateCategory({ id: editingCategory.id, ...data });
        toast({ title: 'Category Updated', description: `Category "${data.name}" has been updated.` });
      } else {
        await addCategory(data);
        toast({ title: 'Category Added', description: `Category "${data.name}" has been added.` });
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not save category.",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
      toast({ title: 'Category Deleted', variant: 'destructive' });
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "Could not delete category.",
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
                <CardTitle>Your Categories</CardTitle>
                <CardDescription>Manage the categories for your transactions.</CardDescription>
            </div>
            <Button onClick={() => handleDialogOpen(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length > 0 ? (
          <ul className="space-y-3">
            {categories.map((category) => {
              const IconComponent = getIconComponent(category.icon);
              return (
                <li key={category.id} className="flex items-center gap-4 rounded-lg border p-4">
                  <IconComponent className="h-6 w-6 text-muted-foreground" />
                  <span className="flex-1 font-medium">{category.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDialogOpen(category)}>
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
                            This action cannot be undone. This will permanently delete the category and may affect transactions associated with it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(category.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
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
            <p className="font-medium">No categories found.</p>
            <p className="text-sm mt-1">Add your first category to get started.</p>
          </div>
        )}
      </CardContent>
       {/* Add/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit' : 'Add'} Category</DialogTitle>
                    <DialogDescription>
                        {editingCategory ? 'Update the details for your category.' : 'Create a new category for your transactions.'}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Category Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="icon"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Icon</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select an icon" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {iconNames.map(iconName => {
                                                const Icon = Lucide[iconName];
                                                return (
                                                    <SelectItem key={iconName} value={iconName}>
                                                        <div className="flex items-center gap-3">
                                                            <Icon className="h-4 w-4" />
                                                            <span>{iconName}</span>
                                                        </div>
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
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
                                {editingCategory ? 'Save Changes' : 'Create Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    </Card>
  );
}
