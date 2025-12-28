'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User, TransactionType, Store } from '@/lib/types';
import {
  setDocumentNonBlocking,
  addDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


interface AppContextType {
  stores: Store[];
  activeStore: Store | null;
  setActiveStore: (store: Store | null) => void;
  addStore: (store: Omit<Store, 'id' | 'userId'>) => Promise<void>;
  updateStore: (store: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId' | 'storeId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId' | 'storeId'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateUser: (user: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'|'storeId'>>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LAST_ACTIVE_STORE_KEY = 'lastActiveStoreId';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loadingStores, setLoadingStores] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const setActiveStore = useCallback((store: Store | null) => {
    setActiveStoreState(store);
    if (store) {
      localStorage.setItem(LAST_ACTIVE_STORE_KEY, store.id);
    } else {
      localStorage.removeItem(LAST_ACTIVE_STORE_KEY);
    }
  }, []);

  const addStore = useCallback(async (store: Omit<Store, 'id' | 'userId'>) => {
    if (!authUser || !firestore) return;
    const coll = collection(firestore, `users/${authUser.uid}/stores`);
    const docRef = await addDoc(coll, { ...store, userId: authUser.uid });
    // After adding, set it as active
    setActiveStore({ id: docRef.id, userId: authUser.uid, ...store });
  }, [authUser, firestore, setActiveStore]);

  const updateStore = useCallback(async (store: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => {
    if (!authUser || !firestore) return;
    const docRef = doc(firestore, `users/${authUser.uid}/stores`, store.id);
    updateDocumentNonBlocking(docRef, store);
  }, [authUser, firestore]);

  const deleteStore = useCallback(async (id: string) => {
    if (!authUser || !firestore) return;
    const docRef = doc(firestore, `users/${authUser.uid}/stores`, id);
    // TODO: Add logic to delete all sub-collections as well (transactions, categories, users)
    // This requires a more complex backend function, for now just delete the store doc.
    deleteDocumentNonBlocking(docRef);
    if (activeStore?.id === id) {
      setActiveStore(null);
    }
  }, [authUser, firestore, activeStore, setActiveStore]);

  // Effect for stores
  useEffect(() => {
    if (authUser && firestore) {
      setLoadingStores(true);
      const storesCol = collection(firestore, `users/${authUser.uid}/stores`);
      const unsub = onSnapshot(storesCol, (snapshot) => {
        const storesData = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Store));
        setStores(storesData);

        if (!activeStore) {
          const lastActiveId = localStorage.getItem(LAST_ACTIVE_STORE_KEY);
          const lastActive = storesData.find(s => s.id === lastActiveId);
          setActiveStoreState(lastActive || storesData[0] || null);
        }
        setLoadingStores(false);
      }, (error) => {
        console.error("stores listener error", error);
        setLoadingStores(false);
      });
      return () => unsub();
    } else if (!authUser) {
      setStores([]);
      setActiveStore(null);
      setLoadingStores(true);
    }
  }, [authUser, firestore, activeStore]);


  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => {
    if (!authUser || !firestore || !activeStore) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `users/${authUser.uid}/stores/${activeStore.id}/${collectionName}`);
    addDocumentNonBlocking(coll, { ...data, userId: authUser.uid, storeId: activeStore.id });
  }, [authUser, firestore, activeStore]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId' | 'storeId'>) => {
    if (!authUser || !firestore || !activeStore) return;
    const { id, type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `users/${authUser.uid}/stores/${activeStore.id}/${collectionName}`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [authUser, firestore, activeStore]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!authUser || !firestore || !activeStore) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `users/${authUser.uid}/stores/${activeStore.id}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [authUser, firestore, activeStore]);

  const clearAllTransactions = useCallback(async () => {
    if (!authUser || !firestore || !activeStore) return;

    const incomesRef = collection(firestore, `users/${authUser.uid}/stores/${activeStore.id}/incomes`);
    const expensesRef = collection(firestore, `users/${authUser.uid}/stores/${activeStore.id}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);

    incomesSnap.forEach(doc => batch.delete(doc.ref));
    expensesSnap.forEach(doc => batch.delete(doc.ref));
    
    await batch.commit();

  }, [authUser, firestore, activeStore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId'| 'storeId'>) => {
    if (!authUser || !firestore || !activeStore) return;
    const coll = collection(firestore, `users/${authUser.uid}/stores/${activeStore.id}/categories`);
    addDocumentNonBlocking(coll, { ...category, userId: authUser.uid, storeId: activeStore.id });
  }, [authUser, firestore, activeStore]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'|'storeId'>>) => {
    if (!authUser || !firestore || !activeStore) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `users/${authUser.uid}/stores/${activeStore.id}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [authUser, firestore, activeStore]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!authUser || !firestore || !activeStore) return;
    const docRef = doc(firestore, `users/${authUser.uid}/stores/${activeStore.id}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [authUser, firestore, activeStore]);
  
  const addUser = useCallback(async (user: Omit<User, 'id' | 'userId' | 'storeId'>) => {
    if (!authUser || !firestore || !activeStore) return;
    const coll = collection(firestore, `users/${authUser.uid}/stores/${activeStore.id}/app_users`);
    addDocumentNonBlocking(coll, { ...user, userId: authUser.uid, storeId: activeStore.id });
  }, [authUser, firestore, activeStore]);
  
  const updateUser = useCallback(async (updatedUser: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'|'storeId'>>) => {
    if (!authUser || !firestore || !activeStore) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `users/${authUser.uid}/stores/${activeStore.id}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [authUser, firestore, activeStore]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!authUser || !firestore || !activeStore) return;
    const docRef = doc(firestore, `users/${authUser.uid}/stores/${activeStore.id}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [authUser, firestore, activeStore]);

  // Effect for active store data
  useEffect(() => {
    if (authUser && firestore && activeStore) {
      setLoadingData(true);

      const basePath = `users/${authUser.uid}/stores/${activeStore.id}`;
      const incomesCol = collection(firestore, `${basePath}/incomes`);
      const expensesCol = collection(firestore, `${basePath}/expenses`);
      const categoriesCol = collection(firestore, `${basePath}/categories`);
      const usersCol = collection(firestore, `${basePath}/app_users`);

      let initialLoads = 4;
      const handleInitialLoad = () => {
        initialLoads--;
        if (initialLoads === 0) {
          setLoadingData(false);
        }
      };
      
      const unsubIncomes = onSnapshot(incomesCol, 
        (snapshot) => {
          const incomeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' })) as Transaction[];
          setTransactions(prev => [...prev.filter(t => t.type !== 'income' || t.storeId !== activeStore.id), ...incomeData]);
          handleInitialLoad();
        },
        (error) => { console.error("incomes listener error", error); handleInitialLoad(); }
      );
      
      const unsubExpenses = onSnapshot(expensesCol, 
        (snapshot) => {
          const expenseData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' })) as Transaction[];
           setTransactions(prev => [...prev.filter(t => t.type !== 'expense' || t.storeId !== activeStore.id), ...expenseData]);
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
    } else if (!activeStore) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoadingData(false);
    }
  }, [authUser, firestore, activeStore]);
  
  const loading = loadingStores || loadingData;

  const value = {
    stores,
    activeStore,
    setActiveStore,
    addStore,
    updateStore,
    deleteStore,
    transactions: activeStore ? transactions.filter(t => t.storeId === activeStore.id) : [],
    categories: activeStore ? categories.filter(c => c.storeId === activeStore.id) : [],
    users: activeStore ? users.filter(u => u.storeId === activeStore.id) : [],
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
