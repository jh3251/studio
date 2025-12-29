'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { useAuth, useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: AppUser[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<AppUser, 'id' | 'userId'>) => Promise<void>;
  updateUser: (user: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id'|'userId'>>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!authUser) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `users/${authUser.uid}/${collectionName}`);
    await addDoc(coll, { ...data, userId: authUser.uid });
  }, [firestore, authUser]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId'>) => {
    if (!authUser) return;
    const { id, type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `users/${authUser.uid}/${collectionName}`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [firestore, authUser]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!authUser) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `users/${authUser.uid}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [firestore, authUser]);

  const clearAllTransactions = useCallback(async () => {
    if (!authUser) return;
    const incomesRef = collection(firestore, `users/${authUser.uid}/incomes`);
    const expensesRef = collection(firestore, `users/${authUser.uid}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);
    incomesSnap.forEach(d => batch.delete(d.ref));
    expensesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, [firestore, authUser]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!authUser) return;
    const coll = collection(firestore, `users/${authUser.uid}/categories`);
    await addDoc(coll, { ...category, userId: authUser.uid });
  }, [firestore, authUser]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'>>) => {
    if (!authUser) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `users/${authUser.uid}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [firestore, authUser]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!authUser) return;
    const docRef = doc(firestore, `users/${authUser.uid}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [firestore, authUser]);
  
  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'userId'>) => {
    if (!authUser) return;
    const coll = collection(firestore, `users/${authUser.uid}/app_users`);
    await addDoc(coll, { ...user, userId: authUser.uid });
  }, [firestore, authUser]);
  
  const updateUser = useCallback(async (updatedUser: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id'|'userId'>>) => {
    if (!authUser) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `users/${authUser.uid}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [firestore, authUser]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!authUser) return;
    const docRef = doc(firestore, `users/${authUser.uid}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [firestore, authUser]);

  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);
      const basePath = `users/${authUser.uid}`;
  
      const unsubExpenses = onSnapshot(collection(firestore, `${basePath}/expenses`), (snapshot) => {
        const expenses = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'expense' })) as Transaction[];
        setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenses]);
      });
  
      const unsubIncomes = onSnapshot(collection(firestore, `${basePath}/incomes`), (snapshot) => {
        const incomes = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'income' })) as Transaction[];
        setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomes]);
      });
  
      const unsubCategories = onSnapshot(collection(firestore, `${basePath}/categories`), (snapshot) => {
        setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
      });
  
      const unsubUsers = onSnapshot(collection(firestore, `${basePath}/app_users`), (snapshot) => {
        setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as AppUser[]);
      });

      const timer = setTimeout(() => setLoading(false), 500);
  
      return () => {
        unsubExpenses();
        unsubIncomes();
        unsubCategories();
        unsubUsers();
        clearTimeout(timer);
      };
    } else if (!authUser) {
      // Reset state on logout
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [authUser, firestore]);
  

  const value: AppContextType = {
    transactions,
    categories,
    users,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
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
