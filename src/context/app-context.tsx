'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

import type { Transaction, Category } from '@/lib/types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => void;
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
        collection(firestore, `users/${user.uid}/incomes`),
        (snapshot) => {
          const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomes]);
        }
      );
      
      const expensesUnsub = onSnapshot(
        collection(firestore, `users/${user.uid}/expenses`),
        (snapshot) => {
          const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenses]);
          setLoading(false);
        }
      );

      const categoriesUnsub = onSnapshot(
        collection(firestore, `users/${user.uid}/categories`),
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

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!user) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/${collectionName}`), { ...data, userId: user.uid });
  };
  
  const addCategory = async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!user) return;
    addDocumentNonBlocking(collection(firestore, `users/${user.uid}/categories`), { ...category, userId: user.uid });
  };
  
  const updateCategory = async (updatedCategory: Category) => {
    if (!user) return;
    const { id, ...data } = updatedCategory;
    updateDocumentNonBlocking(doc(firestore, `users/${user.uid}/categories`, id), data);
  };
  
  const deleteCategory = async (id: string) => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(firestore, `users/${user.uid}/categories`, id));
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
