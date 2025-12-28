'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Scale, LayoutDashboard, BarChart3, Tag, LogOut, Loader2 } from 'lucide-react';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from '@/components/ui/sidebar';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/categories', icon: Tag, label: 'Categories' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const handleLogout = async () => {
    await signOut(auth);
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('');
  };

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
       <div className="px-4 py-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 p-2 h-auto">
              {isUserLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                  <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col items-start text-left">
                <span className="font-medium text-sm truncate">{user?.displayName || 'Anonymous'}</span>
                <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
