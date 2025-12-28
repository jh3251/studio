export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  userName: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}
