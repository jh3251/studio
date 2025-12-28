import type { Transaction, Category } from './types';

export const initialCategories: Category[] = [
  { id: 'cat1', name: 'Food', icon: 'Utensils' },
  { id: 'cat2', name: 'Transport', icon: 'Car' },
  { id: 'cat3', name: 'Salary', icon: 'Briefcase' },
  { id: 'cat4', name: 'Shopping', icon: 'ShoppingCart' },
  { id: 'cat5', name: 'Housing', icon: 'Home' },
  { id: 'cat6', name: 'Entertainment', icon: 'Film' },
];

export const initialTransactions: Transaction[] = [
  {
    id: 'txn1',
    description: 'Monthly Salary',
    amount: 5000,
    type: 'income',
    categoryId: 'cat3',
    date: new Date(new Date().setDate(1)).toISOString(),
  },
  {
    id: 'txn2',
    description: 'Rent',
    amount: 1500,
    type: 'expense',
    categoryId: 'cat5',
    date: new Date(new Date().setDate(2)).toISOString(),
  },
  {
    id: 'txn3',
    description: 'Grocery Shopping',
    amount: 250,
    type: 'expense',
    categoryId: 'cat1',
    date: new Date(new Date().setDate(3)).toISOString(),
  },
  {
    id: 'txn4',
    description: 'Gasoline',
    amount: 60,
    type: 'expense',
    categoryId: 'cat2',
    date: new Date(new Date().setDate(5)).toISOString(),
  },
  {
    id: 'txn5',
    description: 'Movie Tickets',
    amount: 30,
    type: 'expense',
    categoryId: 'cat6',
    date: new Date(new Date().setDate(7)).toISOString(),
  },
  {
    id: 'txn6',
    description: 'New T-shirt',
    amount: 45,
    type: 'expense',
    categoryId: 'cat4',
    date: new Date(new Date().setDate(8)).toISOString(),
  },
  {
    id: 'txn7',
    description: 'Freelance Project',
    amount: 750,
    type: 'income',
    categoryId: 'cat3',
    date: new Date(new Date().setDate(10)).toISOString(),
  },
];
