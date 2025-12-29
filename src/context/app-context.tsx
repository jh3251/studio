'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType, Store } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';

const ACTIVE_STORE_KEY = 'activeStoreId';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: AppUser[];
  stores: Store[];
  activeStore: Store | null;
  setActiveStore: (store: Store | null) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId' | 'storeId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId' | 'storeId'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<AppUser, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateUser: (user: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id' | 'userId' | 'storeId'>>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addStore: (store: Omit<Store, 'id' | 'userId'>) => Promise<void>;
  updateStore: (store: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const setActiveStore = useCallback((store: Store | null) => {
    setActiveStoreState(store);
    if (store) {
      localStorage.setItem(ACTIVE_STORE_KEY, store.id);
    } else {
      localStorage.removeItem(ACTIVE_STORE_KEY);
    }
  }, []);

  const basePath = authUser && activeStore ? `users/${authUser.uid}/stores/${activeStore.id}` : null;

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => {
    if (!basePath) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `${basePath}/${collectionName}`);
    await addDocumentNonBlocking(coll, { ...data, storeId: activeStore!.id, userId: authUser!.uid });
  }, [basePath, firestore, activeStore, authUser]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId' | 'storeId'>) => {
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
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId' | 'storeId'>) => {
    if (!basePath) return;
    const coll = collection(firestore, `${basePath}/categories`);
    await addDocumentNonBlocking(coll, { ...category, storeId: activeStore!.id, userId: authUser!.uid });
  }, [basePath, firestore, activeStore, authUser]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId' | 'storeId'>>) => {
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
  
  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'userId' | 'storeId'>) => {
    if (!basePath) return;
    const coll = collection(firestore, `${basePath}/app_users`);
    await addDocumentNonBlocking(coll, { ...user, storeId: activeStore!.id, userId: authUser!.uid });
  }, [basePath, firestore, activeStore, authUser]);
  
  const updateUser = useCallback(async (updatedUser: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id'|'userId' | 'storeId'>>) => {
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

  const addStore = useCallback(async (store: Omit<Store, 'id' | 'userId'>) => {
    if (!authUser) return;
    const coll = collection(firestore, `users/${authUser.uid}/stores`);
    await addDocumentNonBlocking(coll, { ...store, userId: authUser.uid });
  }, [firestore, authUser]);

  const updateStore = useCallback(async (store: Pick<Store, 'id'> & Partial<Omit<Store, 'id'|'userId'>>) => {
    if (!authUser) return;
    const { id, ...data } = store;
    const docRef = doc(firestore, `users/${authUser.uid}/stores`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [firestore, authUser]);

  const deleteStore = useCallback(async (id: string) => {
    if (!authUser) return;
    const storeRef = doc(firestore, `users/${authUser.uid}/stores`, id);
    
    // Consider deleting subcollections if necessary, this is a complex operation
    // For now, just delete the store document
    await deleteDocumentNonBlocking(storeRef);
    
    if (activeStore?.id === id) {
      setActiveStore(null);
    }
  }, [firestore, authUser, activeStore, setActiveStore]);

  // Effect for fetching stores and setting initial active store
  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);
      const storesColl = collection(firestore, `users/${authUser.uid}/stores`);
      const unsubStores = onSnapshot(storesColl, (snapshot) => {
        const fetchedStores = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Store[];
        setStores(fetchedStores);

        const lastActiveId = localStorage.getItem(ACTIVE_STORE_KEY);
        const lastActiveStore = fetchedStores.find(s => s.id === lastActiveId);

        if (lastActiveStore) {
          setActiveStoreState(lastActiveStore);
        } else if (fetchedStores.length > 0) {
          setActiveStoreState(fetchedStores[0]);
        } else {
          setActiveStoreState(null);
        }
        setLoading(false);
      });
      return () => unsubStores();
    } else {
      // Not logged in
      setStores([]);
      setActiveStoreState(null);
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [authUser, firestore]);

  // Effect for fetching data based on active store
  useEffect(() => {
    if (authUser && firestore && activeStore) {
      const currentBasePath = `users/${authUser.uid}/stores/${activeStore.id}`;
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
    } else if (!activeStore) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [activeStore, authUser, firestore]);

  const value: AppContextType = {
    transactions,
    categories,
    users,
    stores,
    activeStore,
    setActiveStore,
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
    addStore,
    updateStore,
    deleteStore,
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
