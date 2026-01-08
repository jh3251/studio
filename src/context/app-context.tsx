'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType, UserPreferences, Store } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
  setDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';

interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
  userBalances: { name: string; balance: number }[];
}

interface AppContextType {
  transactions: Transaction[];
  categories: Category[];
  users: AppUser[];
  stores: Store[];
  activeStore: Store | null;
  currency: string;
  address: string;
  financialSummary: FinancialSummary;
  setActiveStore: (storeId: string) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  setAddress: (address: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId'| 'storeId'> & { originalType?: TransactionType }) => Promise<void>;
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
  addStore: (store: Omit<Store, 'id' | 'userId'>) => Promise<string | undefined>;
  updateStore: (storeId: string, data: Partial<Omit<Store, 'id' | 'userId'>>) => Promise<void>;
  deleteStore: (storeId: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [currency, setCurrencyState] = useState<string>('USD');
  const [address, setAddressState] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [localExpenses, setLocalExpenses] = useState<Transaction[]>([]);
  const [localIncomes, setLocalIncomes] = useState<Transaction[]>([]);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const basePath = authUser ? `users/${authUser.uid}` : null;
  const activeStore = useMemo(() => stores.find(s => s.id === activeStoreId) || null, [stores, activeStoreId]);

  const financialSummary = useMemo<FinancialSummary>(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    const userBalanceMap = new Map<string, { income: number; expense: number }>();
    
    users.forEach(user => {
        userBalanceMap.set(user.name, { income: 0, expense: 0 });
    });

    transactions.forEach(t => {
      if (t.type === 'income') {
        totalIncome += t.amount;
        const currentUser = userBalanceMap.get(t.userName) || { income: 0, expense: 0 };
        userBalanceMap.set(t.userName, { ...currentUser, income: currentUser.income + t.amount });
      } else {
        totalExpense += t.amount;
        const currentUser = userBalanceMap.get(t.userName) || { income: 0, expense: 0 };
        userBalanceMap.set(t.userName, { ...currentUser, expense: currentUser.expense + t.amount });
      }
    });

    const userBalances = Array.from(userBalanceMap.entries()).map(([name, { income, expense }]) => ({
      name,
      balance: income - expense,
    }));

    return { totalIncome, totalExpense, totalBalance: totalIncome - totalExpense, userBalances };
  }, [transactions, users]);


  const setActiveStore = useCallback(async (storeId: string) => {
    if (!basePath || !firestore) return;
    const userPrefsRef = doc(firestore, `${basePath}/preferences/user`);
    await setDocumentNonBlocking(userPrefsRef, { activeStoreId: storeId }, { merge: true });
    setActiveStoreId(storeId);
  }, [basePath, firestore]);

  const setCurrency = useCallback(async (newCurrency: string) => {
    if (!basePath || !firestore) return;
    const userPrefsRef = doc(firestore, `${basePath}/preferences/user`);
    await setDocumentNonBlocking(userPrefsRef, { currency: newCurrency }, { merge: true });
    setCurrencyState(newCurrency);
  }, [basePath, firestore]);

  const setAddress = useCallback(async (newAddress: string) => {
    if (!basePath || !firestore) return;
    const userPrefsRef = doc(firestore, `${basePath}/preferences/user`);
    await setDocumentNonBlocking(userPrefsRef, { address: newAddress }, { merge: true });
    setAddressState(newAddress);
  }, [basePath, firestore]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => {
    if (!basePath || !authUser || !activeStoreId) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `${basePath}/stores/${activeStoreId}/${collectionName}`);
    await addDocumentNonBlocking(coll, { ...data, userId: authUser.uid, storeId: activeStoreId });
  }, [basePath, firestore, authUser, activeStoreId]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId' | 'storeId'> & { originalType?: TransactionType }) => {
    if (!basePath || !firestore || !authUser || !activeStoreId) return;
    const { id, type, originalType, ...data } = transaction;

    const storePath = `${basePath}/stores/${activeStoreId}`;

    if (type === originalType) {
        const collectionName = type === 'income' ? 'incomes' : 'expenses';
        const docRef = doc(firestore, `${storePath}/${collectionName}`, id);
        
        const updatePayload: Partial<Transaction> = {
            userName: data.userName,
            amount: data.amount,
            date: data.date,
        };
        if (type === 'expense') {
            updatePayload.categoryId = data.categoryId;
        }
        
        await updateDocumentNonBlocking(docRef, updatePayload);
    } else {
        const batch = writeBatch(firestore);
        
        const oldCollectionName = originalType === 'income' ? 'incomes' : 'expenses';
        const oldDocRef = doc(firestore, `${storePath}/${oldCollectionName}`, id);
        batch.delete(oldDocRef);

        const newCollectionName = type === 'income' ? 'incomes' : 'expenses';
        const newDocRef = doc(collection(firestore, `${storePath}/${newCollectionName}`));
        
        const newDocPayload: Omit<Transaction, 'id'> = {
            userId: authUser.uid,
            storeId: activeStoreId,
            userName: data.userName,
            amount: data.amount,
            date: data.date,
            type: type,
        };
        if (type === 'expense') {
            newDocPayload.categoryId = data.categoryId;
        }

        batch.set(newDocRef, newDocPayload);
        await batch.commit();
    }
  }, [basePath, firestore, authUser, activeStoreId]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!basePath || !activeStoreId) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore, activeStoreId]);

  const clearAllTransactions = useCallback(async () => {
    if (!basePath || !firestore || !activeStoreId) return;
    const storePath = `${basePath}/stores/${activeStoreId}`;
    const incomesRef = collection(firestore, `${storePath}/incomes`);
    const expensesRef = collection(firestore, `${storePath}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);
    incomesSnap.forEach(d => batch.delete(d.ref));
    expensesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, [basePath, firestore, activeStoreId]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId' | 'storeId' | 'position'>) => {
    if (!basePath || !authUser || !activeStoreId) return;
    const coll = collection(firestore, `${basePath}/stores/${activeStoreId}/categories`);
    const newPosition = categories.length;
    await addDocumentNonBlocking(coll, { ...category, userId: authUser.uid, storeId: activeStoreId, position: newPosition });
  }, [basePath, firestore, authUser, categories, activeStoreId]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId' | 'storeId'>>) => {
    if (!basePath || !activeStoreId) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore, activeStoreId]);

  const updateCategoryOrder = useCallback(async (reorderedCategories: Category[]) => {
    if (!basePath || !firestore || !activeStoreId) return;
    const batch = writeBatch(firestore);
    reorderedCategories.forEach((category, index) => {
      const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/categories`, category.id);
      batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [basePath, firestore, activeStoreId]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!basePath || !activeStoreId) return;
    const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore, activeStoreId]);
  
  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'userId' | 'storeId' | 'position'>) => {
    if (!basePath || !authUser || !activeStoreId) return;
    const coll = collection(firestore, `${basePath}/stores/${activeStoreId}/app_users`);
    const newPosition = users.length;
    await addDocumentNonBlocking(coll, { ...user, userId: authUser.uid, storeId: activeStoreId, position: newPosition });
  }, [basePath, firestore, authUser, users, activeStoreId]);
  
  const updateUser = useCallback(async (updatedUser: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id' | 'userId' | 'storeId'>>) => {
    if (!basePath || !activeStoreId) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore, activeStoreId]);

  const updateUserOrder = useCallback(async (reorderedUsers: AppUser[]) => {
    if (!basePath || !firestore || !activeStoreId) return;
    const batch = writeBatch(firestore);
    reorderedUsers.forEach((user, index) => {
      const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/app_users`, user.id);
      batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [basePath, firestore, activeStoreId]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!basePath || !activeStoreId) return;
    const docRef = doc(firestore, `${basePath}/stores/${activeStoreId}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore, activeStoreId]);

  const addStore = useCallback(async (store: Omit<Store, 'id' | 'userId'>) => {
    if (!basePath || !authUser || !firestore) return;
    const coll = collection(firestore, `${basePath}/stores`);
    const newDocRef = await addDocumentNonBlocking(coll, { ...store, userId: authUser.uid });
    return newDocRef?.id;
  }, [basePath, firestore, authUser]);

  const updateStore = useCallback(async (storeId: string, data: Partial<Omit<Store, 'id' | 'userId'>>) => {
    if (!basePath || !firestore) return;
    const docRef = doc(firestore, `${basePath}/stores`, storeId);
    await updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);

  const deleteStore = useCallback(async (storeId: string) => {
    if (!basePath || !firestore) return;
    // TODO: Consider deleting subcollections
    const docRef = doc(firestore, `${basePath}/stores`, storeId);
    await deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);

  // Effect for fetching user-level data (preferences, stores)
  useEffect(() => {
    if (!authUser || !firestore) {
      setStores([]);
      setActiveStoreId(null);
      setCurrencyState('USD');
      setAddressState('');
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const userPath = `users/${authUser.uid}`;
    const unsubscribes: (() => void)[] = [];

    const userPrefsRef = doc(firestore, `${userPath}/preferences/user`);
    unsubscribes.push(onSnapshot(userPrefsRef, (snapshot) => {
      if (snapshot.exists()) {
        const prefs = snapshot.data() as UserPreferences;
        setCurrencyState(prefs.currency || 'USD');
        setAddressState(prefs.address || '');
        if (prefs.activeStoreId) {
          setActiveStoreId(prefs.activeStoreId);
        }
      } else {
        setDocumentNonBlocking(userPrefsRef, { currency: 'USD', address: '' }, { merge: true });
      }
    }));
    
    const storesQuery = query(collection(firestore, `${userPath}/stores`));
    unsubscribes.push(onSnapshot(storesQuery, (snapshot) => {
        const fetchedStores = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Store[];
        setStores(fetchedStores);

        const currentActiveId = activeStoreId;
        const activeStoreExists = fetchedStores.some(s => s.id === currentActiveId);

        if (!activeStoreExists && fetchedStores.length > 0) {
            const newActiveId = fetchedStores[0].id;
            setActiveStoreId(newActiveId);
            const userPrefsRef = doc(firestore, `${userPath}/preferences/user`);
            setDocumentNonBlocking(userPrefsRef, { activeStoreId: newActiveId }, { merge: true });
        } else if (fetchedStores.length === 0) {
            setActiveStoreId(null);
        }
        
        if (fetchedStores.length === 0) {
           addStore({ name: 'Personal' }).then(newStoreId => {
             if (newStoreId) {
                setActiveStore(newStoreId);
             }
           });
        }
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [authUser, firestore, addStore, setActiveStore]);

  // Effect for fetching store-specific data
  useEffect(() => {
    if (!authUser || !firestore || !activeStoreId) {
        setTransactions([]);
        setCategories([]);
        setUsers([]);
        setLoading(false);
        return;
    }
    
    setLoading(true);
    const storePath = `users/${authUser.uid}/stores/${activeStoreId}`;
    const unsubscribes: (() => void)[] = [];

    const expensesQuery = query(collection(firestore, `${storePath}/expenses`));
    unsubscribes.push(onSnapshot(expensesQuery, (snapshot) => {
      setLocalExpenses(snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'expense' })) as Transaction[]);
    }));

    const incomesQuery = query(collection(firestore, `${storePath}/incomes`));
    unsubscribes.push(onSnapshot(incomesQuery, (snapshot) => {
      setLocalIncomes(snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'income' })) as Transaction[]);
    }));

    const categoriesQuery = query(collection(firestore, `${storePath}/categories`), orderBy('position'));
    unsubscribes.push(onSnapshot(categoriesQuery, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
    }));

    const usersQuery = query(collection(firestore, `${storePath}/app_users`), orderBy('position'));
    unsubscribes.push(onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as AppUser[]);
    }));
    
    getDocs(usersQuery).then(userSnapshot => {
        if (userSnapshot.empty && authUser.displayName) {
            addUser({ name: authUser.displayName });
        }
    });

    setLoading(false);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [activeStoreId, authUser, firestore, addUser]);


  // Effect to merge transactions when local streams update
  useEffect(() => {
    setTransactions([...localExpenses, ...localIncomes]);
  }, [localExpenses, localIncomes]);

  const value = useMemo(() => ({
    transactions,
    categories,
    users,
    stores,
    activeStore,
    currency,
    address,
    financialSummary,
    setActiveStore,
    setCurrency,
    setAddress,
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
    deleteStore,
    loading
  }), [
    transactions,
    categories,
    users,
    stores,
    activeStore,
    currency,
    address,
    financialSummary,
    loading,
    setActiveStore,
    setCurrency,
    setAddress,
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
    deleteStore,
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
