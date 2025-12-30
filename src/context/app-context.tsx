'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, doc, writeBatch, getDocs, query, orderBy } from 'firebase/firestore';
import { useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User as AppUser, TransactionType, UserPreferences } from '@/lib/types';
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
  currency: string;
  address: string;
  financialSummary: FinancialSummary;
  setCurrency: (currency: string) => Promise<void>;
  setAddress: (address: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' >) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'position'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId'>>) => Promise<void>;
  updateCategoryOrder: (categories: Category[]) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<AppUser, 'id' | 'userId' | 'position'>) => Promise<void>;
  updateUser: (user: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id' | 'userId'>>) => Promise<void>;
  updateUserOrder: (users: AppUser[]) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [currency, setCurrencyState] = useState<string>('USD');
  const [address, setAddressState] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [localExpenses, setLocalExpenses] = useState<Transaction[]>([]);
  const [localIncomes, setLocalIncomes] = useState<Transaction[]>([]);
  
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const basePath = authUser ? `users/${authUser.uid}` : null;

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

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId'>) => {
    if (!basePath || !authUser) return;
    const { type, ...data } = transaction;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const coll = collection(firestore, `${basePath}/${collectionName}`);
    await addDocumentNonBlocking(coll, { ...data, userId: authUser.uid });
  }, [basePath, firestore, authUser]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId'>) => {
    if (!basePath || !firestore || !authUser) return;
    const { id, type, originalType, ...data } = transaction;

    if (type === originalType) {
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      const docRef = doc(firestore, `${basePath}/${collectionName}`, id);
      const updateData: Partial<Transaction> = { ...data };
      if (type === 'income') {
        delete updateData.categoryId;
      }
      await updateDocumentNonBlocking(docRef, updateData);
    } else {
        const batch = writeBatch(firestore);
        
        const oldCollectionName = originalType === 'income' ? 'incomes' : 'expenses';
        const oldDocRef = doc(firestore, `${basePath}/${oldCollectionName}`, id);
        batch.delete(oldDocRef);

        const newCollectionName = type === 'income' ? 'incomes' : 'expenses';
        const newDocRef = doc(firestore, `${basePath}/${newCollectionName}`, id);
        
        const { date, amount, userName, categoryId } = data;
        const newDocData: Omit<Transaction, 'id' | 'type' | 'originalType'> = { date, amount, userName, userId: authUser.uid };
        if (type === 'expense') {
          newDocData.categoryId = categoryId;
        }
        
        batch.set(newDocRef, newDocData);
        
        await batch.commit();
    }
  }, [basePath, firestore, authUser]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    if (!basePath) return;
    const collectionName = type === 'income' ? 'incomes' : 'expenses';
    const docRef = doc(firestore, `${basePath}/${collectionName}`, transactionId);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);

  const clearAllTransactions = useCallback(async () => {
    if (!basePath || !firestore) return;
    const incomesRef = collection(firestore, `${basePath}/incomes`);
    const expensesRef = collection(firestore, `${basePath}/expenses`);

    const incomesSnap = await getDocs(incomesRef);
    const expensesSnap = await getDocs(expensesRef);

    const batch = writeBatch(firestore);
    incomesSnap.forEach(d => batch.delete(d.ref));
    expensesSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }, [basePath, firestore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId' |'position'>) => {
    if (!basePath || !authUser) return;
    const coll = collection(firestore, `${basePath}/categories`);
    const newPosition = categories.length;
    await addDocumentNonBlocking(coll, { ...category, userId: authUser.uid, position: newPosition });
  }, [basePath, firestore, authUser, categories]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'>>) => {
    if (!basePath) return;
    const { id, ...data } = updatedCategory;
    const docRef = doc(firestore, `${basePath}/categories`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);

  const updateCategoryOrder = useCallback(async (reorderedCategories: Category[]) => {
    if (!basePath || !firestore) return;
    const batch = writeBatch(firestore);
    reorderedCategories.forEach((category, index) => {
      const docRef = doc(firestore, `${basePath}/categories`, category.id);
      batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [basePath, firestore]);
  
  const deleteCategory = useCallback(async (id: string) => {
    if (!basePath) return;
    const docRef = doc(firestore, `${basePath}/categories`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);
  
  const addUser = useCallback(async (user: Omit<AppUser, 'id' | 'userId' | 'position'>) => {
    if (!basePath || !authUser) return;
    const coll = collection(firestore, `${basePath}/app_users`);
    const newPosition = users.length;
    await addDocumentNonBlocking(coll, { ...user, userId: authUser.uid, position: newPosition });
  }, [basePath, firestore, authUser, users]);
  
  const updateUser = useCallback(async (updatedUser: Pick<AppUser, 'id'> & Partial<Omit<AppUser, 'id'|'userId'>>) => {
    if (!basePath) return;
    const { id, ...data } = updatedUser;
    const docRef = doc(firestore, `${basePath}/app_users`, id);
    updateDocumentNonBlocking(docRef, data);
  }, [basePath, firestore]);

  const updateUserOrder = useCallback(async (reorderedUsers: AppUser[]) => {
    if (!basePath || !firestore) return;
    const batch = writeBatch(firestore);
    reorderedUsers.forEach((user, index) => {
      const docRef = doc(firestore, `${basePath}/app_users`, user.id);
      batch.update(docRef, { position: index });
    });
    await batch.commit();
  }, [basePath, firestore]);
  
  const deleteUser = useCallback(async (id: string) => {
    if (!basePath) return;
    const docRef = doc(firestore, `${basePath}/app_users`, id);
    deleteDocumentNonBlocking(docRef);
  }, [basePath, firestore]);

  // Effect for fetching user data
  useEffect(() => {
    if (!authUser || !firestore) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setCurrencyState('USD');
      setAddressState('');
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribes: (() => void)[] = [];
    const userPath = `users/${authUser.uid}`;

    const userPrefsRef = doc(firestore, `${userPath}/preferences/user`);
    unsubscribes.push(onSnapshot(userPrefsRef, (snapshot) => {
      if (snapshot.exists()) {
        const prefs = snapshot.data() as UserPreferences;
        if (prefs.currency) setCurrencyState(prefs.currency);
        if (prefs.address) setAddressState(prefs.address);
      } else {
        // This is a new user, so create a default preferences doc.
        setDocumentNonBlocking(userPrefsRef, { currency: 'USD', address: '' }, { merge: true });
      }
    }));

    const expensesQuery = query(collection(firestore, `${userPath}/expenses`));
    const incomesQuery = query(collection(firestore, `${userPath}/incomes`));
    const categoriesQuery = query(collection(firestore, `${userPath}/categories`), orderBy('position'));
    const usersQuery = query(collection(firestore, `${userPath}/app_users`), orderBy('position'));

    unsubscribes.push(onSnapshot(expensesQuery, (snapshot) => {
      setLocalExpenses(snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'expense' })) as Transaction[]);
    }));

    unsubscribes.push(onSnapshot(incomesQuery, (snapshot) => {
      setLocalIncomes(snapshot.docs.map(d => ({ ...d.data(), id: d.id, type: 'income' })) as Transaction[]);
    }));

    unsubscribes.push(onSnapshot(categoriesQuery, (snapshot) => {
      setCategories(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as Category[]);
    }));

    unsubscribes.push(onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as AppUser[]);
    }));
    
    getDocs(usersQuery).then(userSnapshot => {
        if (userSnapshot.empty && authUser.displayName) {
            const coll = collection(firestore, `${userPath}/app_users`);
            addDocumentNonBlocking(coll, { name: authUser.displayName, userId: authUser.uid, position: 0 });
        }
    });

    setLoading(false);

    return () => unsubscribes.forEach(unsub => unsub());
  }, [authUser, firestore]);

  // Effect to merge transactions when local streams update
  useEffect(() => {
    setTransactions([...localExpenses, ...localIncomes]);
  }, [localExpenses, localIncomes]);

  const value = useMemo(() => ({
    transactions,
    categories,
    users,
    currency,
    address,
    financialSummary,
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
    loading
  }), [
    transactions,
    categories,
    users,
    currency,
    address,
    financialSummary,
    loading,
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
