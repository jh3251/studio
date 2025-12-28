'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';

import type { Transaction, Category, User } from '@/lib/types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => void;
  updateCategory: (category: Category) => void;
  deleteCategory: (id: string) => void;
  addUser: (user: Omit<User, 'id' | 'userId'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (id: string) => void;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);
      
      const incomeUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/incomes`),
        (snapshot) => {
          const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomes]);
        }
      );
      
      const expensesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/expenses`),
        (snapshot) => {
          const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenses]);
          if(loading) setLoading(false);
        }
      );

      const categoriesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/categories`),
        (snapshot) => {
           const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setCategories(cats);
        }
      );
      
      const usersUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/app_users`),
        (snapshot) => {
           const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          setUsers(users);
        }
      );

      return () => {
        incomeUnsub();
        expensesUnsub();
        categoriesUnsub();
        usersUnsub();
      };
    } else if (!authUser) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [authUser, firestore, loading]);

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!authUser) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    addDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/${collectionName}`), { ...data, userId: authUser.uid });
  };
  
  const addCategory = async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!authUser) return;
    addDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/categories`), { ...category, userId: authUser.uid });
  };
  
  const updateCategory = async (updatedCategory: Category) => {
    if (!authUser) return;
    const { id, ...data } = updatedCategory;
    updateDocumentNonBlocking(doc(firestore, `users/${authUser.uid}/categories`, id), data);
  };
  
  const deleteCategory = async (id: string) => {
    if (!authUser) return;
    deleteDocumentNonBlocking(doc(firestore, `users/${authUser.uid}/categories`, id));
  };
  
  const addUser = async (user: Omit<User, 'id' | 'userId'>) => {
    if (!authUser) return;
    addDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/app_users`), { ...user, userId: authUser.uid });
  };
  
  const updateUser = async (updatedUser: User) => {
    if (!authUser) return;
    const { id, ...data } = updatedUser;
    updateDocumentNonBlocking(doc(firestore, `users/${authUser.uid}/app_users`, id), data);
  };
  
  const deleteUser = async (id: string) => {
    if (!authUser) return;
    deleteDocumentNonBlocking(doc(firestore, `users/${authUser.uid}/app_users`, id));
  };

  const value = {
    transactions,
    categories,
    users,
    addTransaction,
    addCategory,
    updateCategory,
    deleteCategory,
    addUser,
    updateUser,
    deleteUser,
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
