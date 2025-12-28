import { ReportsView } from '@/components/app/reports-view';

export default function ReportsPage() {
  return (
    <div className="space-y-8">
       <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Visualize your spending habits and get AI-powered insights.</p>
      </div>
      <ReportsView />
    </div>
  );
}
