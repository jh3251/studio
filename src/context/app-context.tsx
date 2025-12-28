'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

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
      const transactionsUnsub = onSnapshot(
        collection(firestore, `users/${user.uid}/transactions`),
        (snapshot) => {
          const trans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
          setTransactions(trans);
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
        transactionsUnsub();
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
    await addDoc(collection(firestore, `users/${user.uid}/transactions`), {
      ...transaction,
      userId: user.uid,
    });
  };
  
  const addCategory = async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!user) return;
    await addDoc(collection(firestore, `users/${user.uid}/categories`), {
      ...category,
      userId: user.uid,
    });
  };
  
  const updateCategory = async (updatedCategory: Category) => {
    if (!user) return;
    const { id, ...data } = updatedCategory;
    await updateDoc(doc(firestore, `users/${user.uid}/categories`, id), data);
  };
  
  const deleteCategory = async (id: string) => {
    if (!user) return;
    await deleteDoc(doc(firestore, `users/${user.uid}/categories`, id));
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
