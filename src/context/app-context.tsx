'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';

import type { Transaction, Category, User, TransactionType } from '@/lib/types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'userId'>) => Promise<void>;
  updateUser: (user: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'>>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
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

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    await addDoc(collection(firestore, `users/${authUser.uid}/${collectionName}`), { ...data, userId: authUser.uid });
  }, [authUser, firestore]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId'>) => {
    if (!authUser || !firestore) return;
    const { id, type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    await updateDoc(doc(firestore, `users/${authUser.uid}/${collectionName}`, id), data);
  }, [authUser, firestore]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!authUser || !firestore) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    await deleteDoc(doc(firestore, `users/${authUser.uid}/${collectionName}`, transactionId));
  }, [authUser, firestore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    await addDoc(collection(firestore, `users/${authUser.uid}/categories`), { ...category, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'>>) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedCategory;
    await updateDoc(doc(firestore, `users/${authUser.uid}/categories`, id), data);
  }, [authUser, firestore]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!authUser || !firestore) return;
    await deleteDoc(doc(firestore, `users/${authUser.uid}/categories`, id));
  }, [authUser, firestore]);
  
  const addUser = useCallback(async (user: Omit<User, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    await addDoc(collection(firestore, `users/${authUser.uid}/app_users`), { ...user, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateUser = useCallback(async (updatedUser: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'>>) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedUser;
    await updateDoc(doc(firestore, `users/${authUser.uid}/app_users`, id), data);
  }, [authUser, firestore]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!authUser || !firestore) return;
    await deleteDoc(doc(firestore, `users/${authUser.uid}/app_users`, id));
  }, [authUser, firestore]);

  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);
      const collectionsToLoad = ['categories', 'app_users', 'incomes', 'expenses'];
      let loadedCount = 0;

      const checkLoadingComplete = () => {
        loadedCount++;
        if (loadedCount === collectionsToLoad.length) {
          setLoading(false);
        }
      };
      
      const incomesCol = collection(firestore, `users/${authUser.uid}/incomes`);
      const expensesCol = collection(firestore, `users/${authUser.uid}/expenses`);
      const categoriesCol = collection(firestore, `users/${authUser.uid}/categories`);
      const usersCol = collection(firestore, `users/${authUser.uid}/app_users`);

      const unsubIncomes = onSnapshot(incomesCol, 
        (snapshot) => {
          const incomeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' })) as Transaction[];
          setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomeData]);
          if(loadedCount < collectionsToLoad.length) checkLoadingComplete();
        },
        (error) => { console.error("incomes listener error", error); if(loadedCount < collectionsToLoad.length) checkLoadingComplete(); }
      );
      
      const unsubExpenses = onSnapshot(expensesCol, 
        (snapshot) => {
          const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' })) as Transaction[];
           setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenseData]);
          if(loadedCount < collectionsToLoad.length) checkLoadingComplete();
        },
        (error) => { console.error("expenses listener error", error); if(loadedCount < collectionsToLoad.length) checkLoadingComplete(); }
      );

      const unsubCategories = onSnapshot(categoriesCol, 
        (snapshot) => {
          setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);
          if(loadedCount < collectionsToLoad.length) checkLoadingComplete();
        },
        (error) => { console.error("categories listener error", error); if(loadedCount < collectionsToLoad.length) checkLoadingComplete(); }
      );
      
      const unsubUsers = onSnapshot(usersCol, 
        (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]);
          if(loadedCount < collectionsToLoad.length) checkLoadingComplete();
        },
        (error) => { console.error("users listener error", error); if(loadedCount < collectionsToLoad.length) checkLoadingComplete(); }
      );

      return () => {
        unsubIncomes();
        unsubExpenses();
        unsubCategories();
        unsubUsers();
      };
    } else if (!authUser) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(true);
    }
  }, [authUser, firestore]);

  const value = {
    transactions,
    categories,
    users,
    addTransaction,
    updateTransaction,
    deleteTransaction,
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
