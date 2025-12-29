'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType, Store } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';

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
  const [loading, setLoading] = useState(true);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const setActiveStore = (store: Store | null) => {
    setActiveStoreState(store);
    if (store) {
      localStorage.setItem(ACTIVE_STORE_LS_KEY, store.id);
    } else {
      localStorage.removeItem(ACTIVE_STORE_LS_KEY);
    }
  };

  const basePath = authUser ? `users/${authUser.uid}` : null;
  const storePath = activeStore ? `${basePath}/stores/${activeStore.id}` : null;

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
    if (!storePath) return;
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
    if (!storePath) return;
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
    if (!storePath) return;
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
    if (!basePath) return;
    const batch = writeBatch(firestore);
    reorderedStores.forEach((store, index) => {
        const docRef = doc(firestore, `${basePath}/stores`, store.id);
        batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [basePath, firestore]);

  const deleteStore = useCallback(async (id: string) => {
    if (!basePath) return;
    const docRef = doc(firestore, `${basePath}/stores`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);


  // Effect for fetching stores and setting initial active store
  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);
      const storesColl = query(collection(firestore, `users/${authUser.uid}/stores`), orderBy('position'));
      const unsubStores = onSnapshot(storesColl, (snapshot) => {
        const fetchedStores = snapshot.docs.map(d => ({...d.data(), id: d.id})) as Store[];
        setStores(fetchedStores);
        
        if (!activeStore) {
          const lastActiveId = localStorage.getItem(ACTIVE_STORE_LS_KEY);
          const storeToActivate = fetchedStores.find(s => s.id === lastActiveId) || fetchedStores[0] || null;
          setActiveStoreState(storeToActivate);
        } else {
            // if the active store was deleted, switch to another one or null
            if (!fetchedStores.some(s => s.id === activeStore.id)) {
                setActiveStoreState(fetchedStores[0] || null);
            }
        }
        setLoading(false);
      });

      return () => unsubStores();
    } else {
      // Not logged in
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setStores([]);
      setActiveStoreState(null);
      setLoading(false);
    }
  }, [authUser, firestore]);


  // Effect for fetching data based on active store
  useEffect(() => {
    let unsubExpenses: () => void = () => {};
    let unsubIncomes: () => void = () => {};
    let unsubCategories: () => void = () => {};
    let unsubUsers: () => void = () => {};

    if (activeStore && firestore && authUser) {
        const currentStorePath = `users/${authUser.uid}/stores/${activeStore.id}`;
        setLoading(true);
      
        unsubExpenses = onSnapshot(collection(firestore, `${currentStorePath}/expenses`), (snapshot) => {
            const expenses = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'expense' })) as Transaction[];
            setTransactions(prev => [...prev.filter(t => t.type !== 'expense' || t.storeId !== activeStore.id), ...expenses]);
        });
    
        unsubIncomes = onSnapshot(collection(firestore, `${currentStorePath}/incomes`), (snapshot) => {
            const incomes = snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'income' })) as Transaction[];
            setTransactions(prev => [...prev.filter(t => t.type !== 'income' || t.storeId !== activeStore.id), ...incomes]);
        });
    
        unsubCategories = onSnapshot(query(collection(firestore, `${currentStorePath}/categories`), orderBy('position')), (snapshot) => {
            const newCategories = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[];
            setCategories(prev => [...prev.filter(c => c.storeId !== activeStore.id), ...newCategories]);
        });
    
        unsubUsers = onSnapshot(query(collection(firestore, `${currentStorePath}/app_users`), orderBy('position')), (snapshot) => {
            const newUsers = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as AppUser[];
            setUsers(prev => [...prev.filter(u => u.storeId !== activeStore.id), ...newUsers]);
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
  }, [activeStore, firestore, authUser]);

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
