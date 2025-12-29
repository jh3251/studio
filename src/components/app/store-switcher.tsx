'use client';

import { useRouter } from 'next/navigation';
import { ChevronsUpDown, PlusCircle, Store as StoreIcon } from 'lucide-react';
import { useAppContext } from '@/context/app-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '../ui/skeleton';
import { Store } from '@/lib/types';

export function StoreSwitcher() {
  const { stores, activeStore, setActiveStore, loading } = useAppContext();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (loading) {
    return <Skeleton className="h-10 w-48" />;
  }

  const handleStoreSelect = (store: Store) => {
    setActiveStore(store);
    setOpen(false);
  };
  
  const handleCreateStore = () => {
    router.push('/stores');
    setOpen(false);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[200px] justify-between"
        >
          <StoreIcon className="mr-2 h-4 w-4" />
          {activeStore ? activeStore.name : 'Select a store...'}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px] p-0">
        <DropdownMenuGroup>
            {stores.map((store) => (
                <DropdownMenuItem
                    key={store.id}
                    onSelect={() => handleStoreSelect(store)}
                    className="text-sm"
                >
                    <StoreIcon className="mr-2 h-4 w-4" />
                    {store.name}
                </DropdownMenuItem>
            ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCreateStore}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Store
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
