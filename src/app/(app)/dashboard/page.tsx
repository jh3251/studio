import { DashboardClient } from '@/components/app/dashboard-client';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Get a quick overview of your financial status.</p>
      </div>
      <DashboardClient />
    </div>
  );
}
