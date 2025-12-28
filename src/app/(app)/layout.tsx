'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/app/sidebar-nav';
import { useUser } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

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
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
