'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { AddTransactionSheet } from '@/components/app/add-transaction-sheet';
import { useAppContext } from '@/context/app-context';

export function NewTransactionButton() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { users } = useAppContext();
  
  const canAddTransaction = users.length > 0;

  return (
    <>
      
        <Button onClick={() => setIsSheetOpen(true)} disabled={!canAddTransaction}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      
      <AddTransactionSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
    </>
  );
}
