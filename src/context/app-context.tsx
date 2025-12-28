'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
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

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    addDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/${collectionName}`), { ...data, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const addCategory = useCallback((category: Omit<Category, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    addDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/categories`), { ...category, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateCategory = useCallback((updatedCategory: Category) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedCategory;
    updateDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/categories`).doc(id), data);
  }, [authUser, firestore]);
  
  const deleteCategory = useCallback((id: string) => {
    if (!authUser || !firestore) return;
    deleteDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/categories`).doc(id));
  }, [authUser, firestore]);
  
  const addUser = useCallback((user: Omit<User, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    addDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/app_users`), { ...user, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateUser = useCallback((updatedUser: User) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedUser;
    updateDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/app_users`).doc(id), data);
  }, [authUser, firestore]);
  
  const deleteUser = useCallback((id: string) => {
    if (!authUser || !firestore) return;
    deleteDocumentNonBlocking(collection(firestore, `users/${authUser.uid}/app_users`).doc(id));
  }, [authUser, firestore]);


  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);

      const unsubscribes: (() => void)[] = [];
      let pendingListeners = 3; // incomes, expenses, categories, users

      const onDataLoaded = () => {
        pendingListeners--;
        if (pendingListeners === 0) {
          setLoading(false);
        }
      };

      const incomesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/incomes`),
        (snapshot) => {
          const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomes]);
          onDataLoaded();
        },
        (error) => {
          console.error("Error fetching incomes:", error);
          onDataLoaded();
        }
      );
      unsubscribes.push(incomesUnsub);

      const expensesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/expenses`),
        (snapshot) => {
          const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc_1.data(), type: 'expense' } as Transaction));
          setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenses]);
          onDataLoaded();
        },
        (error) => {
          console.error("Error fetching expenses:", error);
          onDataLoaded();
        }
      );
      unsubscribes.push(expensesUnsub);

      const categoriesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/categories`),
        (snapshot) => {
           const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setCategories(cats);
          onDataLoaded();
        },
        (error) => {
          console.error("Error fetching categories:", error);
          onDataLoaded();
        }
      );
      unsubscribes.push(categoriesUnsub);
      
      const usersUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/app_users`),
        (snapshot) => {
           const appUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          setUsers(appUsers);
        },
        (error) => console.error("Error fetching app_users:", error)
      );
      unsubscribes.push(usersUnsub);


      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    } else if (!authUser) {
      // Clear data and loading state when user logs out
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [authUser, firestore]);

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
