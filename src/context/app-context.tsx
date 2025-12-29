'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, writeBatch, getDocs, query, where, getDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth, useFirestore, useUser } from '@/firebase';

import type { Transaction, Category, User, TransactionType, Store, UserRole } from '@/lib/types';
import {
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
} from '@/firebase/non-blocking-updates';


interface AppContextType {
  userRole: UserRole['role'] | null;
  stores: Store[];
  activeStore: Store | null;
  setActiveStore: (store: Store | null) => void;
  addStore: (storeData: Omit<Store, 'id' | 'userId'>) => Promise<void>;
  updateStore: (storeData: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => Promise<void>;
  deleteStore: (id: string, email: string) => Promise<void>;
  transactions: Transaction[];
  categories: Category[];
  users: User[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId' | 'adminId'>) => Promise<void>;
  updateTransaction: (transaction: Omit<Transaction, 'userId' | 'storeId' | 'adminId'>) => Promise<void>;
  deleteTransaction: (transactionId: string, type: TransactionType) => Promise<void>;
  clearAllTransactions: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id' | 'userId' | 'storeId' | 'adminId'>) => Promise<void>;
  updateCategory: (category: Pick<Category, 'id'> & Partial<Omit<Category, 'id' | 'userId' | 'storeId' | 'adminId'>>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addUser: (user: Omit<User, 'id' | 'userId' | 'storeId' | 'adminId'>) => Promise<void>;
  updateUser: (user: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'|'storeId' | 'adminId'>>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  loading: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const LAST_ACTIVE_STORE_KEY = 'lastActiveStoreId';

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [userRole, setUserRole] = useState<UserRole['role'] | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStoreState] = useState<Store | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  const auth = useAuth();
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const setActiveStore = useCallback((store: Store | null) => {
    setActiveStoreState(store);
    if (store && userRole === 'admin') {
      localStorage.setItem(LAST_ACTIVE_STORE_KEY, store.id);
    } else {
      localStorage.removeItem(LAST_ACTIVE_STORE_KEY);
    }
  }, [userRole]);

  // Effect to determine user role and fetch associated data
  useEffect(() => {
    if (authUser && firestore) {
      setLoading(true);
      const roleRef = doc(firestore, 'user_roles', authUser.uid);
      const unsub = onSnapshot(roleRef, async (roleSnap) => {
        if (roleSnap.exists()) {
          const roleData = roleSnap.data() as UserRole;
          setUserRole(roleData.role);

          if (roleData.role === 'admin') {
            // Admin: fetch all their stores
            const storesCol = collection(firestore, `users/${authUser.uid}/stores`);
            const storesSnap = await getDocs(storesCol);
            const storesData = storesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Store));
            setStores(storesData);
            
            const lastActiveId = localStorage.getItem(LAST_ACTIVE_STORE_KEY);
            const lastActive = storesData.find(s => s.id === lastActiveId);
            setActiveStoreState(lastActive || storesData[0] || null);

          } else if (roleData.role === 'store' && roleData.storeId && roleData.adminId) {
            // Store user: fetch their single assigned store
            const storeRef = doc(firestore, `users/${roleData.adminId}/stores`, roleData.storeId);
            const storeSnap = await getDoc(storeRef);
            if (storeSnap.exists()) {
              const storeData = { id: storeSnap.id, ...storeSnap.data() } as Store;
              setStores([storeData]);
              setActiveStoreState(storeData);
            }
          }
        } else {
            // This might be a brand new admin user, role doc not created yet.
            // Login flow handles this, but we can default to admin for now.
             setUserRole('admin');
        }
        // setLoading(false); // Data loading will handle this
      }, (error) => {
        console.error("User role listener error", error);
        setLoading(false);
      });
      return () => unsub();
    } else if (!authUser) {
      // Reset state on logout
      setUserRole(null);
      setStores([]);
      setActiveStore(null);
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [authUser, firestore]);

 const getAdminId = useCallback(() => {
    if (userRole === 'admin' && authUser) {
      return authUser.uid;
    }
    if (userRole === 'store') {
        // This is a bit of a hack, we need to get the adminId from the user_roles doc
        // a better way would be to store it in the context
        const roleDoc = doc(firestore, 'user_roles', authUser!.uid);
        return getDoc(roleDoc).then(doc => (doc.data() as UserRole)?.adminId || null);
    }
    return null;
  }, [userRole, authUser, firestore]);


  // All data management functions need to know the correct adminId
  const withAdminId = async <T>(func: (adminId: string) => Promise<T>): Promise<T | undefined> => {
    if (!authUser || !firestore || !userRole) return;

    if (userRole === 'admin') {
      return func(authUser.uid);
    } else {
      const roleRef = doc(firestore, `user_roles/${authUser.uid}`);
      const roleSnap = await getDoc(roleRef);
      if (roleSnap.exists()) {
        const adminId = roleSnap.data().adminId;
        if (adminId) {
          return func(adminId);
        }
      }
    }
    console.error("Could not determine admin ID for operation.");
    return undefined;
  };


  const addStore = useCallback(async (storeData: Omit<Store, 'id' | 'userId'>) => {
    await withAdminId(async (adminId) => {
      // 1. Create a new Firebase Auth user for the store
      const userCredential = await createUserWithEmailAndPassword(auth, storeData.email, storeData.password);
      const storeUser = userCredential.user;

      // 2. Add the store document to the admin's subcollection
      const coll = collection(firestore, `users/${adminId}/stores`);
      const docRef = await addDoc(coll, { ...storeData, userId: adminId });
      
      // 3. Create the role document linking the store user's UID to the store
      const roleRef = doc(firestore, 'user_roles', storeUser.uid);
      await setDoc(roleRef, {
        uid: storeUser.uid,
        role: 'store',
        storeId: docRef.id,
        adminId: adminId,
      });

      // After adding, set it as active
      setActiveStore({ id: docRef.id, userId: adminId, ...storeData });
    });
  }, [auth, firestore, setActiveStore, withAdminId]);

  const updateStore = useCallback(async (storeData: Pick<Store, 'id'> & Partial<Omit<Store, 'id' | 'userId'>>) => {
     await withAdminId(async (adminId) => {
        const docRef = doc(firestore, `users/${adminId}/stores`, storeData.id);
        // Note: We don't allow email to be updated. Password update would require re-authentication and is complex.
        updateDocumentNonBlocking(docRef, { name: storeData.name });
     });
  }, [withAdminId, firestore]);

 const deleteStore = useCallback(async (id: string, email: string) => {
    // This is complex because it requires deleting a Firebase Auth user, which is a privileged operation.
    // A secure implementation would use a Cloud Function triggered by the document deletion.
    // For this prototype, we'll just delete the Firestore data and accept the auth user will be orphaned.
    await withAdminId(async (adminId) => {
      const docRef = doc(firestore, `users/${adminId}/stores`, id);
      // TODO: Add logic to delete all sub-collections as well (transactions, categories, users)
      deleteDocumentNonBlocking(docRef);
      // Also need to find and delete the corresponding user_roles doc
      const rolesQuery = query(collection(firestore, 'user_roles'), where('storeId', '==', id));
      const rolesSnap = await getDocs(rolesQuery);
      rolesSnap.forEach(roleDoc => deleteDocumentNonBlocking(roleDoc.ref));

      if (activeStore?.id === id) {
        setActiveStore(null);
      }
    });
  }, [withAdminId, firestore, activeStore, setActiveStore]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, 'id' | 'userId' | 'storeId'>) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const { type, ...data } = transaction;
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      const coll = collection(firestore, `users/${adminId}/stores/${activeStore.id}/${collectionName}`);
      addDoc(coll, { ...data, userId: adminId, storeId: activeStore.id });
    });
  }, [withAdminId, firestore, activeStore]);

  const updateTransaction = useCallback(async (transaction: Omit<Transaction, 'userId' | 'storeId'>) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const { id, type, ...data } = transaction;
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      const docRef = doc(firestore, `users/${adminId}/stores/${activeStore.id}/${collectionName}`, id);
      updateDocumentNonBlocking(docRef, data);
    });
  }, [withAdminId, firestore, activeStore]);
  
  const deleteTransaction = useCallback(async (transactionId: string, type: TransactionType) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const collectionName = type === 'income' ? 'incomes' : 'expenses';
      const docRef = doc(firestore, `users/${adminId}/stores/${activeStore.id}/${collectionName}`, transactionId);
      deleteDocumentNonBlocking(docRef);
    });
  }, [withAdminId, firestore, activeStore]);

  const clearAllTransactions = useCallback(async () => {
    await withAdminId(async (adminId) => {
        if (!activeStore) return;
        const incomesRef = collection(firestore, `users/${adminId}/stores/${activeStore.id}/incomes`);
        const expensesRef = collection(firestore, `users/${adminId}/stores/${activeStore.id}/expenses`);

        const incomesSnap = await getDocs(incomesRef);
        const expensesSnap = await getDocs(expensesRef);

        const batch = writeBatch(firestore);
        incomesSnap.forEach(d => batch.delete(d.ref));
        expensesSnap.forEach(d => batch.delete(d.ref));
        await batch.commit();
    });
  }, [withAdminId, firestore, activeStore]);
  
  const addCategory = useCallback(async (category: Omit<Category, 'id' | 'userId'| 'storeId'>) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const coll = collection(firestore, `users/${adminId}/stores/${activeStore.id}/categories`);
      addDoc(coll, { ...category, userId: adminId, storeId: activeStore.id });
    });
  }, [withAdminId, firestore, activeStore]);
  
  const updateCategory = useCallback(async (updatedCategory: Pick<Category, 'id'> & Partial<Omit<Category, 'id'|'userId'|'storeId'>>) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const { id, ...data } = updatedCategory;
      const docRef = doc(firestore, `users/${adminId}/stores/${activeStore.id}/categories`, id);
      updateDocumentNonBlocking(docRef, data);
    });
  }, [withAdminId, firestore, activeStore]);
  
  const deleteCategory = useCallback(async (id: string) => {
     await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const docRef = doc(firestore, `users/${adminId}/stores/${activeStore.id}/categories`, id);
      deleteDocumentNonBlocking(docRef);
    });
  }, [withAdminId, firestore, activeStore]);
  
  const addUser = useCallback(async (user: Omit<User, 'id' | 'userId' | 'storeId'>) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const coll = collection(firestore, `users/${adminId}/stores/${activeStore.id}/app_users`);
      addDoc(coll, { ...user, userId: adminId, storeId: activeStore.id });
    });
  }, [withAdminId, firestore, activeStore]);
  
  const updateUser = useCallback(async (updatedUser: Pick<User, 'id'> & Partial<Omit<User, 'id'|'userId'|'storeId'>>) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const { id, ...data } = updatedUser;
      const docRef = doc(firestore, `users/${adminId}/stores/${activeStore.id}/app_users`, id);
      updateDocumentNonBlocking(docRef, data);
    });
  }, [withAdminId, firestore, activeStore]);
  
  const deleteUser = useCallback(async (id: string) => {
    await withAdminId(async (adminId) => {
      if (!activeStore) return;
      const docRef = doc(firestore, `users/${adminId}/stores/${activeStore.id}/app_users`, id);
      deleteDocumentNonBlocking(docRef);
    });
  }, [withAdminId, firestore, activeStore]);

  // Effect for active store data
  useEffect(() => {
    if (authUser && firestore && activeStore && userRole) {
      setLoading(true);
      
      withAdminId(async (adminId) => {
        const basePath = `users/${adminId}/stores/${activeStore.id}`;
        const incomesCol = collection(firestore, `${basePath}/incomes`);
        const expensesCol = collection(firestore, `${basePath}/expenses`);
        const categoriesCol = collection(firestore, `${basePath}/categories`);
        const usersCol = collection(firestore, `${basePath}/app_users`);

        const unsubscribes = [
          onSnapshot(incomesCol, snapshot => {
            const incomeData = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: 'income' })) as Transaction[];
            setTransactions(prev => [...prev.filter(t => t.type !== 'income' || t.storeId !== activeStore.id), ...incomeData]);
          }, console.error),
          onSnapshot(expensesCol, snapshot => {
            const expenseData = snapshot.docs.map(d => ({ id: d.id, ...d.data(), type: 'expense' })) as Transaction[];
            setTransactions(prev => [...prev.filter(t => t.type !== 'expense' || t.storeId !== activeStore.id), ...expenseData]);
          }, console.error),
          onSnapshot(categoriesCol, snapshot => {
            setCategories(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Category[]);
          }, console.error),
          onSnapshot(usersCol, snapshot => {
            setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as User[]);
          }, console.error)
        ];
        
        // This is a rough way to handle loading state. A more robust solution
        // might use Promise.all with getDocs for initial load.
        setTimeout(() => setLoading(false), 1500);

        return () => unsubscribes.forEach(unsub => unsub());
      });

    } else if (!activeStore) {
      setTransactions([]);
      setCategories([]);
      setUsers([]);
      setLoading(false);
    }
  }, [authUser, firestore, activeStore, userRole, withAdminId]);
  

  const value: AppContextType = {
    userRole,
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
