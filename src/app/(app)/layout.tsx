'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/app/sidebar-nav';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppContext } from '@/context/app-context';
import { StoreSwitcher } from '@/components/app/store-switcher';
import { useToast } from '@/hooks/use-toast';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { stores, activeStore, loading: isAppLoading } = useAppContext();
  const { toast } = useToast();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (!isAppLoading && stores.length > 0 && !activeStore) {
        toast({
            title: "No Active Store",
            description: "Please select a store to begin.",
        });
    }
  }, [isAppLoading, stores, activeStore, toast]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full">
        <Skeleton className="hidden md:block md:w-64" />
        <div className="flex-1 p-8 space-y-8">
          <Skeleton className="h-10 w-1/4" />
          <div className="grid gap-4 sm:grid-cols-3">
              <Skeleton className="h-[126px]" />
              <Skeleton className="h-[126px]" />
              <Skeleton className="h-[126px]" />
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="sm:hidden" />
            <StoreSwitcher />
            <div className="flex-1" />
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
