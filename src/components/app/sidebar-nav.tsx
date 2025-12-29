'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Tag, LogOut, Loader2, Users, Store as StoreIcon, Code, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useState } from 'react';

import { cn } from '@/lib/utils';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
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
       <div className="px-4 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-2 p-2 h-auto">
              {isUserLoading ? (
                <Loader2 className="w-8 h-8 animate-spin" />
              ) : (
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.email || ''} />
                  <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
                </Avatar>
              )}
              <div className="flex flex-col items-start text-left">
                <span className="font-medium text-sm truncate">{user?.email || 'User'}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mb-2" side="top" align="start">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setIsAboutDialogOpen(true)}>
              <Code className="mr-2 h-4 w-4" />
              <span>About</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

       <div className="border-t p-4">
          <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                  <AvatarImage src="https://avatars.githubusercontent.com/u/1024025?v=4" alt="Jabed Hossain Sifat" />
                  <AvatarFallback>JS</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                  <span className="font-semibold text-sm">Jabed Hossain Sifat</span>
                  <span className="text-xs text-muted-foreground">Developer</span>
              </div>
          </div>
      </div>

      <Dialog open={isAboutDialogOpen} onOpenChange={setIsAboutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>About SumBook</DialogTitle>
            <DialogDescription>This application was developed by Jabed Hossain Sifat.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center pt-4">
            <p className="text-sm text-muted-foreground">Thank you for using SumBook!</p>

          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
