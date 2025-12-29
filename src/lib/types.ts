export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string; // The admin user's ID
  storeId: string;
  userName: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
}

export interface Category {
  id:string;
  userId: string; // The admin user's ID
  storeId: string;
  name: string;
  icon: string;
}

export interface User {
  id: string;
  userId: string; // The admin user's ID
  storeId: string;
  name: string;
}

export interface Store {
  id: string;
  userId: string; // The admin user's ID
  name: string;
  email: string;
  password?: string; // Password should not be stored long-term here, just for creation
}

export interface UserRole {
  uid: string;
  role: 'admin' | 'store';
  storeId?: string; // Only for 'store' role
  adminId?: string; // Only for 'store' role
}
