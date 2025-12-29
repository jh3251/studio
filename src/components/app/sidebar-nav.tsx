'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tag, LogOut, Loader2, Users, Store as StoreIcon, Code, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import React, { useState } from 'react';

import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar, SidebarSeparator } from '@/components/ui/sidebar';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { SumbookIcon } from '../icons/sumbook-icon';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/users', icon: Users, label: 'Users' },
  { href: '/categories', icon: Tag, label: 'Categories' },
  { href: '/stores', icon: StoreIcon, label: 'Stores' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

export function SidebarNav() {
  const pathname = usePathname();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const [isAboutDialogOpen, setIsAboutDialogOpen] = useState(false);
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
          {navItems.map((item, index) => (
            <React.Fragment key={item.href}>
              <SidebarMenuItem>
                <Link href={item.href} onClick={handleNavClick}>
                  <SidebarMenuButton isActive={pathname.startsWith(item.href)} tooltip={item.label}>
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              {index < navItems.length - 1 && <SidebarSeparator className="my-1" />}
            </React.Fragment>
          ))}
        </SidebarMenu>
      </div>
      
      <div className="border-t p-4">
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
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setIsAboutDialogOpen(true)}>
                <Code className="mr-2 h-4 w-4" />
                <span>About Developer</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About SumBook</DialogTitle>
            <DialogDescription>This application was developed by Jabed Hossain Sifat.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center pt-4">
             <Avatar className="w-24 h-24">
                  <AvatarImage src="https://i.ibb.co/sJbqLgck/Whats-App-Image-2024-08-13-at-18-30-49-5dd1efa6.jpg" alt="Jabed Hossain Sifat" />
                  <AvatarFallback>JS</AvatarFallback>
              </Avatar>
          </div>
           <div className="text-center space-y-1">
                <p className="font-semibold">Jabed Hossain Sifat</p>
                <p className="text-sm text-muted-foreground">Developer</p>
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
