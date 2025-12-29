import { StoreManager } from '@/components/app/store-manager';

export default function StoresPage() {
  return (
    <div className="space-y-6">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Stores</h1>
        <p className="text-muted-foreground">Create and manage your stores.</p>
      </div>
      <StoreManager />
    </div>
  );
}
