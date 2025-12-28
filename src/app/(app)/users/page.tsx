import { UserManager } from '@/components/app/user-manager';

export default function UsersPage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Users</h1>
        <p className="text-muted-foreground">Create and manage your users.</p>
      </div>
      <UserManager />
    </div>
  );
}
