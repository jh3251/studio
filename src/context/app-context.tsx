'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

import type { Transaction, Category } from '@/lib/types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (user && firestore) {
      setLoading(true);
      
      const incomeUnsub = onSnapshot(
        collection(firestore, `incomes`),
        (snapshot) => {
          const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomes]);
        }
      );
      
      const expensesUnsub = onSnapshot(
        collection(firestore, `expenses`),
        (snapshot) => {
          const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenses]);
          setLoading(false);
        }
      );

      const categoriesUnsub = onSnapshot(
        collection(firestore, `categories`),
        (snapshot) => {
           const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setCategories(cats);
        }
      );

      return () => {
        incomeUnsub();
        expensesUnsub();
        categoriesUnsub();
      };
    } else if (!user) {
      setTransactions([]);
      setCategories([]);
      setLoading(false);
    }
  }, [user, firestore]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    addDocumentNonBlocking(collection(firestore, `${collectionName}`), data);
  };
  
  const addCategory = async (category: Omit<Category, 'id'>) => {
    if (!user) return;
    addDocumentNonBlocking(collection(firestore, `categories`), category);
  };
  
  const updateCategory = async (updatedCategory: Category) => {
    if (!user) return;
    const { id, ...data } = updatedCategory;
    updateDocumentNonBlocking(doc(firestore, `categories`, id), data);
  };
  
  const deleteCategory = async (id: string) => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(firestore, `categories`, id));
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
