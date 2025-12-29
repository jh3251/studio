'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, orderBy, setDoc } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType, Store, UserPreferences } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: AppUser[];
  stores: Store[];
  activeStore: Store | null;
  currency: string;
  setCurrency: (currency: string) => Promise<void>;
  setActiveStore: (store: Store | null) => void;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId' | 'storeId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'storeId' | 'position'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId' | 'storeId'>>) => Promise<void>;
  updateCategoryOrder: (categories: Category[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<AppUser, 'id' | 'userId' | 'storeId' | 'position'>) => Promise<void>;
  updateUser: (user: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id' | 'userId' | 'storeId'>>) => Promise<void>;
  updateUserOrder: (users: AppUser[]) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addStore: (store: Omit<Store, 'id' | 'userId' | 'position'>) => Promise<void>;
  updateStore: (store: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => Promise<void>;
  updateStoreOrder: (stores: Store[]) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ACTIVE_STORE_LS_KEY = 'activeStoreId';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);
  const [currency, setCurrencyState] = useState<string>('USD');
  const [loading, setLoading] = useState(true);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const basePath = authUser ? `users/${authUser.uid}` : null;
  const storePath = activeStore ? `${basePath}/stores/${activeStore.id}` : null;

  const setActiveStore = (store: Store | null) => {
    setActiveStoreState(store);
    if (store) {
      localStorage.setItem(ACTIVE_STORE_LS_KEY, store.id);
    } else {
      localStorage.removeItem(ACTIVE_STORE_LS_KEY);
    }
  };

  const setCurrency = useCallback(async (newCurrency: string) => {
    if (!authUser || !firestore) return;
    const userPrefsRef = doc(firestore, `users/${authUser.uid}/preferences`, 'user');
    await setDocumentNonBlocking(userPrefsRef, { currency: newCurrency }, { merge: true });
    setCurrencyState(newCurrency);
  }, [authUser, firestore]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => {
    if (!storePath || !activeStore || !authUser) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `${storePath}/${collectionName}`);
    await addDocumentNonBlocking(coll, { ...data, userId: authUser.uid, storeId: activeStore.id });
  }, [storePath, firestore, authUser, activeStore]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId' | 'storeId'>) => {
    if (!storePath) return;
    const { id, type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `${storePath}/${collectionName}`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [storePath, firestore]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!storePath) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `${storePath}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [storePath, firestore]);

  const clearAllTransactions = useCallback(async () => {
    if (!storePath || !firestore) return;
    const incomesRef = collection(firestore, `${storePath}/incomes`);
    const expensesRef = collection(firestore, `${storePath}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);
    incomesSnap.forEach(d => batch.delete(d.ref));
    expensesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, [storePath, firestore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId' | 'storeId'|'position'>) => {
    if (!storePath || !activeStore || !authUser) return;
    const coll = collection(firestore, `${storePath}/categories`);
    const newPosition = categories.filter(c => c.storeId === activeStore.id).length;
    await addDocumentNonBlocking(coll, { ...category, userId: authUser.uid, storeId: activeStore.id, position: newPosition });
  }, [storePath, firestore, authUser, activeStore, categories]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'|'storeId'>>) => {
    if (!storePath) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `${storePath}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [storePath, firestore]);

  const updateCategoryOrder = useCallback(async (reorderedCategories: Category[]) => {
    if (!storePath || !firestore) return;
    const batch = writeBatch(firestore);
    reorderedCategories.forEach((category, index) => {
      const docRef = doc(firestore, `${storePath}/categories`, category.id);
      batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [storePath, firestore]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!storePath) return;
    const docRef = doc(firestore, `${storePath}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [storePath, firestore]);
  
  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'userId' | 'storeId' | 'position'>) => {
    if (!storePath || !activeStore || !authUser) return;
    const coll = collection(firestore, `${storePath}/app_users`);
    const newPosition = users.filter(u => u.storeId === activeStore.id).length;
    await addDocumentNonBlocking(coll, { ...user, userId: authUser.uid, storeId: activeStore.id, position: newPosition });
  }, [storePath, firestore, authUser, activeStore, users]);
  
  const updateUser = useCallback(async (updatedUser: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id'|'userId'|'storeId'>>) => {
    if (!storePath) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `${storePath}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [storePath, firestore]);

  const updateUserOrder = useCallback(async (reorderedUsers: AppUser[]) => {
    if (!storePath || !firestore) return;
    const batch = writeBatch(firestore);
    reorderedUsers.forEach((user, index) => {
      const docRef = doc(firestore, `${storePath}/app_users`, user.id);
      batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [storePath, firestore]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!storePath) return;
    const docRef = doc(firestore, `${storePath}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [storePath, firestore]);

  const addStore = useCallback(async (store: Omit<Store, 'id' | 'userId' | 'position'>) => {
    if (!basePath || !authUser) return;
    const coll = collection(firestore, `${basePath}/stores`);
    const newPosition = stores.length;
    await addDocumentNonBlocking(coll, { ...store, userId: authUser.uid, position: newPosition });
  }, [basePath, firestore, authUser, stores]);

  const updateStore = useCallback(async (store: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => {
    if (!basePath) return;
    const { id, ...data } = store;
    const docRef = doc(firestore, `${basePath}/stores`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);

  const updateStoreOrder = useCallback(async (reorderedStores: Store[]) => {
    if (!basePath || !firestore) return;
    const batch = writeBatch(firestore);
    reorderedStores.forEach((store, index) => {
        const docRef = doc(firestore, `${basePath}/stores`, store.id);
        batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [basePath, firestore]);

  const deleteStore = useCallback(async (id: string) => {
    if (!basePath || !firestore) return;
    // Set active store to another if the deleted one is active
    if (activeStore?.id === id) {
        const otherStores = stores.filter(s => s.id !== id);
        setActiveStore(otherStores[0] || null);
    }
    const docRef = doc(firestore, `${basePath}/stores`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore, activeStore, stores]);


  // Effect for user-level data (stores, preferences)
  useEffect(() => {
    if (!authUser || !firestore) {
      // Not logged in, clear all state
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setStores([]);
      setActiveStoreState(null);
      setCurrencyState('USD');
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];

    const userPrefsRef = doc(firestore, `users/${authUser.uid}/preferences`, 'user');
    unsubscribes.push(onSnapshot(userPrefsRef, (snapshot) => {
      if (snapshot.exists()) {
        const prefs = snapshot.data() as UserPreferences;
        if (prefs.currency) setCurrencyState(prefs.currency);
      }
    }));

    const storesColl = query(collection(firestore, `users/${authUser.uid}/stores`), orderBy('position'));
    unsubscribes.push(onSnapshot(storesColl, (snapshot) => {
      const fetchedStores = snapshot.docs.map(d => ({...d.data(), id: d.id})) as Store[];
      setStores(fetchedStores);
      
      const lastActiveId = localStorage.getItem(ACTIVE_STORE_LS_KEY);
      const currentActive = fetchedStores.find(s => s.id === activeStore?.id);

      if (currentActive) {
        setActiveStoreState(currentActive);
      } else {
        const lastActiveStore = fetchedStores.find(s => s.id === lastActiveId);
        setActiveStoreState(lastActiveStore || fetchedStores[0] || null);
      }

      setLoading(false);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [authUser, firestore, activeStore?.id]);


  // Effect for fetching data related to the active store
  useEffect(() => {
    if (!activeStore || !firestore) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      if (authUser && stores.length > 0) {
        setLoading(false);
      }
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const storePath = `users/${activeStore.userId}/stores/${activeStore.id}`;

    const expensesQuery = query(collection(firestore, `${storePath}/expenses`));
    const incomesQuery = query(collection(firestore, `${storePath}/incomes`));
    const categoriesQuery = query(collection(firestore, `${storePath}/categories`), orderBy('position'));
    const usersQuery = query(collection(firestore, `${storePath}/app_users`), orderBy('position'));

    let expenses: Transaction[] = [];
    let incomes: Transaction[] = [];

    const mergeTransactions = () => {
      setTransactions([...expenses, ...incomes]);
    };

    unsubscribes.push(onSnapshot(expensesQuery, (snapshot) => {
      expenses = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'expense' })) as Transaction[];
      mergeTransactions();
    }));

    unsubscribes.push(onSnapshot(incomesQuery, (snapshot) => {
      incomes = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'income' })) as Transaction[];
      mergeTransactions();
    }));

    unsubscribes.push(onSnapshot(categoriesQuery, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
    }));

    unsubscribes.push(onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as AppUser[]);
    }));
    
    return () => unsubscribes.forEach(unsub => unsub());
  }, [activeStore, firestore]);

  const value = useMemo(() => ({
    transactions,
    categories,
    users,
    stores,
    activeStore,
    currency,
    setCurrency,
    setActiveStore,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
    addCategory,
    updateCategory,
    updateCategoryOrder,
    deleteCategory,
    addUser,
    updateUser,
    updateUserOrder,
    deleteUser,
    addStore,
    updateStore,
    updateStoreOrder,
    deleteStore,
    loading
  }), [
    transactions,
    categories,
    users,
    stores,
    activeStore,
    currency,
    loading,
    setCurrency,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    clearAllTransactions,
    addCategory,
    updateCategory,
    updateCategoryOrder,
    deleteCategory,
    addUser,
    updateUser,
    updateUserOrder,
    deleteUser,
    addStore,
    updateStore,
    updateStoreOrder,
    deleteStore
  ]);

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
