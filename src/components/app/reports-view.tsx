'use client';

import { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainCircuit, Loader2 } from 'lucide-react';

import { useAppContext } from '@/context/app-context';
import { generateInsights } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const COLORS = ['#64B5F6', '#9575CD', '#81C784', '#FFB74D', '#E57373', '#4FC3F7', '#BA68C8'];

export function ReportsView() {
  const { transactions, categories, loading } = useAppContext();
  const [aiInsight, setAiInsight] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateInsight = async () => {
    setIsGenerating(true);
    setAiInsight('');
    const insight = await generateInsights(transactions);
    setAiInsight(insight);
    setIsGenerating(false);
  };

  const expenseByCategory = useMemo(() => {
    const expenseMap = new Map<string, number>();
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const categoryName = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
        expenseMap.set(categoryName, (expenseMap.get(categoryName) || 0) + t.amount);
      });
    return Array.from(expenseMap.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions, categories]);
  
  const totalExpenses = useMemo(() => expenseByCategory.reduce((acc, item) => acc + item.value, 0), [expenseByCategory]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / totalExpenses) * 100).toFixed(2);
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col space-y-1">
              <span className="text-[0.70rem] uppercase text-muted-foreground">{payload[0].name}</span>
              <span className="font-bold text-muted-foreground">{payload[0].value.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ({percentage}%)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
      return (
          <div className="grid gap-6 lg:grid-cols-5">
              <div className="lg:col-span-2 space-y-4">
                  <Skeleton className="h-[200px]" />
              </div>
              <div className="lg:col-span-3">
                  <Skeleton className="h-[400px]" />
              </div>
          </div>
      )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit className="text-primary" />
              AI-Powered Insights
            </CardTitle>
            <CardDescription>Analyze your spending habits with AI.</CardDescription>
          </CardHeader>
          <CardContent>
            {aiInsight && (
              <div className="prose prose-sm dark:prose-invert text-muted-foreground bg-accent/50 p-4 rounded-md border border-accent">
                {aiInsight}
              </div>
            )}
             {isGenerating && (
              <div className="flex items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </div>
            )}
            <Button onClick={handleGenerateInsight} disabled={isGenerating} className="mt-4 w-full">
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BrainCircuit />}
              Generate Analysis
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>A breakdown of your expenses.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[350px]">
              {expenseByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={4}
                    >
                      {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                    No expense data to display.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
