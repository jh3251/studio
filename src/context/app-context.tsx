'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User } from '@/lib/types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId'>) => Promise<void>;
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
  const [incomes, setIncomes] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Transaction[]>([]);
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

      const dataSources = ['incomes', 'expenses', 'categories', 'app_users'];
      const unsubscribes: (() => void)[] = [];
      let loadedSources = 0;

      const checkAllDataLoaded = () => {
        loadedSources++;
        if (loadedSources === dataSources.length) {
          setLoading(false);
        }
      };

      const createSubscription = (path: string, setData: React.Dispatch<any>, type?: 'income' | 'expense') => {
        const unsubscribe = onSnapshot(
          collection(firestore, `users/${authUser.uid}/${path}`),
          (snapshot) => {
            const data = snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data(),
              ...(type && { type }) // Add type for transactions
            }));
            setData(data);
            if (loadedSources < dataSources.length) checkAllDataLoaded();
          },
          (error) => {
            console.error(`Error fetching ${path}:`, error);
            if (loadedSources < dataSources.length) checkAllDataLoaded();
          }
        );
        return unsubscribe;
      };

      unsubscribes.push(createSubscription('incomes', setIncomes, 'income'));
      unsubscribes.push(createSubscription('expenses', setExpenses, 'expense'));
      unsubscribes.push(createSubscription('categories', setCategories));
      unsubscribes.push(createSubscription('app_users', setUsers));

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    } else if (!authUser) {
      setIncomes([]);
      setExpenses([]);
      setCategories([]);
      setUsers([]);
      setLoading(true);
    }
  }, [authUser, firestore]);

  const value = {
    transactions: [...incomes, ...expenses],
    categories,
    users,
    addTransaction,
    updateTransaction,
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
