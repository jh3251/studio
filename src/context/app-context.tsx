'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User, TransactionType } from '@/lib/types';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
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
    const coll = collection(firestore, `users/${authUser.uid}/${collectionName}`);
    addDocumentNonBlocking(coll, { ...data, userId: authUser.uid });
  }, [authUser, firestore]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId'>) => {
    if (!authUser || !firestore) return;
    const { id, type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `users/${authUser.uid}/${collectionName}`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [authUser, firestore]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!authUser || !firestore) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `users/${authUser.uid}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [authUser, firestore]);

  const clearAllTransactions = useCallback(async () => {
    if (!authUser || !firestore) return;

    const incomesRef = collection(firestore, `users/${authUser.uid}/incomes`);
    const expensesRef = collection(firestore, `users/${authUser.uid}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);

    incomesSnap.forEach(doc => batch.delete(doc.ref));
    expensesSnap.forEach(doc => batch.delete(doc.ref));
    
    // We await the commit here as it's a critical, bulk operation
    await batch.commit();

  }, [authUser, firestore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    const coll = collection(firestore, `users/${authUser.uid}/categories`);
    addDocumentNonBlocking(coll, { ...category, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'>>) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `users/${authUser.uid}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [authUser, firestore]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!authUser || !firestore) return;
    const docRef = doc(firestore, `users/${authUser.uid}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [authUser, firestore]);
  
  const addUser = useCallback(async (user: Omit<User, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    const coll = collection(firestore, `users/${authUser.uid}/app_users`);
    addDocumentNonBlocking(coll, { ...user, userId: authUser.uid });
  }, [authUser, firestore]);
  
  const updateUser = useCallback(async (updatedUser: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'>>) => {
    if (!authUser || !firestore) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `users/${authUser.uid}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [authUser, firestore]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!authUser || !firestore) return;
    const docRef = doc(firestore, `users/${authUser.uid}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [authUser, firestore]);

  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);

      const incomesCol = collection(firestore, `users/${authUser.uid}/incomes`);
      const expensesCol = collection(firestore, `users/${authUser.uid}/expenses`);
      const categoriesCol = collection(firestore, `users/${authUser.uid}/categories`);
      const usersCol = collection(firestore, `users/${authUser.uid}/app_users`);

      let initialLoads = 4; // incomes, expenses, categories, users
      const handleInitialLoad = () => {
        initialLoads--;
        if (initialLoads === 0) {
          setLoading(false);
        }
      };
      
      const unsubIncomes = onSnapshot(incomesCol, 
        (snapshot) => {
          const incomeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' })) as Transaction[];
          setTransactions(prev => [...prev.filter(t => t.type !== 'income'), ...incomeData]);
          handleInitialLoad();
        },
        (error) => { console.error("incomes listener error", error); handleInitialLoad(); }
      );
      
      const unsubExpenses = onSnapshot(expensesCol, 
        (snapshot) => {
          const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' })) as Transaction[];
           setTransactions(prev => [...prev.filter(t => t.type !== 'expense'), ...expenseData]);
          handleInitialLoad();
        },
        (error) => { console.error("expenses listener error", error); handleInitialLoad(); }
      );

      const unsubCategories = onSnapshot(categoriesCol, 
        (snapshot) => {
          setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Category[]);
          handleInitialLoad();
        },
        (error) => { console.error("categories listener error", error); handleInitialLoad(); }
      );
      
      const unsubUsers = onSnapshot(usersCol, 
        (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[]);
          handleInitialLoad();
        },
        (error) => { console.error("users listener error", error); handleInitialLoad(); }
      );

      return () => {
        unsubIncomes();
        unsubExpenses();
        unsubCategories();
        unsubUsers();
      };
    } else if (!authUser) {
      // Clear data on logout
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(true); // Set to true on logout to show loading skeleton on re-login
    }
  }, [authUser, firestore]);

  const value = {
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
