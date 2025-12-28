'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User } from '@/lib/types';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => void;
  addCategory: (category: Omit<Category, 'id' | 'userId'>) => void;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId'>>) => void;
  deleteCategory: (id: string) => void;
  addUser: (user: Omit<User, 'id' | 'userId'>) => void;
  updateUser: (user: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'>>) => void;
  deleteUser: (id: string) => void;
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

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    addDoc(collection(firestore, `users/${authUser.uid}/${collectionName}`), { ...data, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const addCategory = useCallback((category: Omit<Category, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    addDoc(collection(firestore, `users/${authUser.uid}/categories`), { ...category, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateCategory = useCallback((updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'>>) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedCategory;
    updateDoc(doc(firestore, `users/${authUser.uid}/categories`, id), data);
  }, [authUser, firestore]);
  
  const deleteCategory = useCallback((id: string) => {
    if (!authUser || !firestore) return;
    deleteDoc(doc(firestore, `users/${authUser.uid}/categories`, id));
  }, [authUser, firestore]);
  
  const addUser = useCallback((user: Omit<User, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    addDoc(collection(firestore, `users/${authUser.uid}/app_users`), { ...user, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateUser = useCallback((updatedUser: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'>>) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedUser;
    updateDoc(doc(firestore, `users/${authUser.uid}/app_users`, id), data);
  }, [authUser, firestore]);
  
  const deleteUser = useCallback((id: string) => {
    if (!authUser || !firestore) return;
    deleteDoc(doc(firestore, `users/${authUser.uid}/app_users`, id));
  }, [authUser, firestore]);

  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);

      const unsubscribes: (() => void)[] = [];
      const dataSources = ['incomes', 'expenses', 'categories', 'app_users'];
      let loadedSources = 0;

      const checkAllDataLoaded = () => {
        loadedSources++;
        if (loadedSources === dataSources.length) {
          setLoading(false);
        }
      };

      const incomesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/incomes`),
        (snapshot) => {
          const incomeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' } as Transaction));
          setIncomes(incomeData);
          checkAllDataLoaded();
        }, (error) => { console.error("Error fetching incomes:", error); checkAllDataLoaded(); }
      );
      unsubscribes.push(incomesUnsub);

      const expensesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/expenses`),
        (snapshot) => {
          const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' } as Transaction));
          setExpenses(expenseData);
          checkAllDataLoaded();
        }, (error) => { console.error("Error fetching expenses:", error); checkAllDataLoaded(); }
      );
      unsubscribes.push(expensesUnsub);

      const categoriesUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/categories`),
        (snapshot) => {
           const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
          setCategories(cats);
          checkAllDataLoaded();
        }, (error) => { console.error("Error fetching categories:", error); checkAllDataLoaded(); }
      );
      unsubscribes.push(categoriesUnsub);
      
      const usersUnsub = onSnapshot(
        collection(firestore, `users/${authUser.uid}/app_users`),
        (snapshot) => {
           const appUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          setUsers(appUsers);
          checkAllDataLoaded();
        }, (error) => { console.error("Error fetching app_users:", error); checkAllDataLoaded(); }
      );
      unsubscribes.push(usersUnsub);

      return () => {
        unsubscribes.forEach(unsub => unsub());
      };
    } else if (!authUser) {
      // Clear data and loading state when user logs out
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
