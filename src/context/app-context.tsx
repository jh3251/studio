'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
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
  updateUser: (user: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id' | 'userId'>>) => Promise<void>;
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

  const basePath = authUser ? `users/${authUser.uid}` : null;

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!basePath) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `${basePath}/${collectionName}`);
    await addDocumentNonBlocking(coll, { ...data, userId: authUser!.uid });
  }, [basePath, firestore, authUser]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId'>) => {
    if (!basePath) return;
    const { id, type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `${basePath}/${collectionName}`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!basePath) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `${basePath}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);

  const clearAllTransactions = useCallback(async () => {
    if (!basePath) return;
    const incomesRef = collection(firestore, `${basePath}/incomes`);
    const expensesRef = collection(firestore, `${basePath}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);
    incomesSnap.forEach(d => batch.delete(d.ref));
    expensesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, [basePath, firestore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!basePath) return;
    const coll = collection(firestore, `${basePath}/categories`);
    await addDocumentNonBlocking(coll, { ...category, userId: authUser!.uid });
  }, [basePath, firestore, authUser]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'>>) => {
    if (!basePath) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `${basePath}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!basePath) return;
    const docRef = doc(firestore, `${basePath}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);
  
  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'userId'>) => {
    if (!basePath) return;
    const coll = collection(firestore, `${basePath}/app_users`);
    await addDocumentNonBlocking(coll, { ...user, userId: authUser!.uid });
  }, [basePath, firestore, authUser]);
  
  const updateUser = useCallback(async (updatedUser: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id'|'userId'>>) => {
    if (!basePath) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `${basePath}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!basePath) return;
    const docRef = doc(firestore, `${basePath}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);


  // Effect for fetching data
  useEffect(() => {
    if (authUser && firestore) {
      const currentBasePath = `users/${authUser.uid}`;
      setLoading(true);

      const unsubExpenses = onSnapshot(collection(firestore, `${currentBasePath}/expenses`), (snapshot) => {
        const expenses = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'expense' })) as Transaction[];
        setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenses]);
      });
  
      const unsubIncomes = onSnapshot(collection(firestore, `${currentBasePath}/incomes`), (snapshot) => {
        const incomes = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'income' })) as Transaction[];
        setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomes]);
      });
  
      const unsubCategories = onSnapshot(collection(firestore, `${currentBasePath}/categories`), (snapshot) => {
        setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
      });
  
      const unsubUsers = onSnapshot(collection(firestore, `${currentBasePath}/app_users`), (snapshot) => {
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
    } else {
      // Not logged in
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
