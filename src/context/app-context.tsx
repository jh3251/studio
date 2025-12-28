'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { Transaction, Category } from '@/lib/types';
import { initialTransactions, initialCategories } from '@/lib/data';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (transaction: Transaction) => void;
  addCategory: (category: Category) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading data from an API
    setTimeout(() => {
      setTransactions(initialTransactions);
      setCategories(initialCategories);
      setLoading(false);
    }, 500);
  }, []);

  const addTransaction = (transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  };
  
  const addCategory = (category: Category) => {
    setCategories(prev => [...prev, category]);
  };
  
  const updateCategory = (updatedCategory: Category) => {
    setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
  };
  
  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const value = {
    transactions,
    categories,
    addTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    loading
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
