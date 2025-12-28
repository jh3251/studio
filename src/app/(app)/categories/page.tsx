import { CategoryManager } from '@/components/app/category-manager';

export default function CategoriesPage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Categories</h1>
        <p className="text-muted-foreground">Create and manage your expense and income categories.</p>
      </div>
      <CategoryManager />
    </div>
  );
}
