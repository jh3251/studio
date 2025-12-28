'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scale, LayoutDashboard, BarChart3, Tag } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/categories', icon: Tag, label: 'Categories' },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex items-center justify-center p-2 rounded-lg bg-primary text-primary-foreground">
          <Scale className="w-6 h-6" />
        </div>
        <span className="text-lg font-semibold font-headline">BalanceWise</span>
      </div>
      <div className="flex-1 px-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
                  <a>
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
    </>
  );
}
