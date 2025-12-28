export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string; // This is optional for income
  date: string;
}

export interface Category {
  id:string;
  userId: string;
  name: string;
  icon: string;
}

export interface User {
  id: string;
  userId: string;
  name: string;
}
