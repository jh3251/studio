'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tag, LogOut, Loader2, Users, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import React from 'react';

import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useAuth, useUser } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { SumbookIcon } from '../icons/sumbook-icon';
import { ThemeToggle } from '../theme-toggle';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/users', icon: Users, label: 'Users' },
  { href: '/categories', icon: Tag, label: 'Categories' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { setOpenMobile } = useSidebar();

  const handleLogout = async () => {
    await signOut(auth);
  };
  
  const handleNavClick = () => {
    setOpenMobile(false);
  }

  const getInitials = (name?: string | null) => {
    if (!name) return 'A';
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
          <SumbookIcon className="w-6 h-6 text-white" />
        </div>
        <span className="text-lg font-semibold font-headline">SumBook</span>
      </div>
      <div className="flex-1 px-4">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} onClick={handleNavClick}>
                <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </div>
      
      <div className="border-t p-4 space-y-4">
         <div className="flex items-center gap-2">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start text-left gap-3 px-2 h-auto">
                {isUserLoading ? (
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                ) : (
                    <Avatar>
                    {user?.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />}
                    <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                    </Avatar>
                )}
                <div className="flex flex-col truncate">
                    <span className="font-semibold text-sm truncate">{user?.displayName || 'Welcome'}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email || 'user@example.com'}</span>
                </div>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
            <ThemeToggle />
         </div>

        <div className="flex items-center gap-3 px-2">
            <Avatar className="w-8 h-8">
                <AvatarImage src="https://i.ibb.co/sJbqLgck/Whats-App-Image-2024-08-13-at-18-30-49-5dd1efa6.jpg" alt="Jabed Hossain Sifat" />
                <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Developed by</span>
                <span className="font-semibold text-sm">Jabed Hossain Sifat</span>
            </div>
        </div>
      </div>
    </>
  );
}
