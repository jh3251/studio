export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  storeId: string;
  userName: string;
  amount: number;
  type: TransactionType;
  categoryId?: string;
  date: string;
  originalType?: TransactionType;
}

export interface Category {
  id:string;
  userId: string;
  storeId: string;
  name: string;
  icon: string;
  position: number;
}

export interface User {
  id: string;
  userId: string;
  storeId: string;
  name: string;
  position: number;
}

export interface Store {
  id: string;
  userId: string;
  name: string;
}

export interface UserPreferences {
  currency: string;
  address?: string;
  activeStoreId?: string;
}
