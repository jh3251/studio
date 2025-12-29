export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
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
