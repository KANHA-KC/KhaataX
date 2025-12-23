export type AccountType = 'cash' | 'bank' | 'card' | 'upi';
export type TransactionType = 'expense' | 'income' | 'transfer';

export interface Transaction {
    id: string;
    date: string; // ISO 8601 YYYY-MM-DD
    amount: number;
    type: TransactionType;
    accountId: string;
    categoryId: string;
    payeeId?: string; // If null, general expense. If set, linked to a Person
    notes?: string;
    createdAt: number; // Timestamp
}

export interface Person {
    id: string;
    name: string;
    createdAt: number;
}

export interface Category {
    id: string;
    name: string;
    type: 'expense' | 'income';
    isDefault?: boolean;
}

export interface Account {
    id: string;
    name: string;
    type: AccountType;
}

export const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cat_food', name: 'Food & Dining', type: 'expense', isDefault: true },
    { id: 'cat_transport', name: 'Transportation', type: 'expense', isDefault: true },
    { id: 'cat_groceries', name: 'Groceries', type: 'expense', isDefault: true },
    { id: 'cat_utilities', name: 'Utilities', type: 'expense', isDefault: true },
    { id: 'cat_entertainment', name: 'Entertainment', type: 'expense', isDefault: true },
    { id: 'cat_health', name: 'Health', type: 'expense', isDefault: true },
    { id: 'cat_settlement', name: 'Settlement / Debt', type: 'expense', isDefault: true }, // Added!
    { id: 'cat_salary', name: 'Salary', type: 'income', isDefault: true },
    { id: 'cat_freelance', name: 'Freelance', type: 'income', isDefault: true },
    { id: 'cat_settlement_in', name: 'Settlement / Debt', type: 'income', isDefault: true }, // Added!
];

export interface StockItem {
    id: string;
    partyName: string; // Firm Name
    marfad: string; // Kisaan Name/Agent
    loadingDate: string; // Date
    weight01: number; // Initial Weight
    coldWeight: number; // Weight 02
    lotNumber: string; // Lot No
    noOfTins: number; // No of Tins
    loanAmount: number;
    loanDate: string;
    principalAmount: number;
    interestRate: number; // Rate of Interest
    updatedAt: number;
    // Optional fallbacks for backward compatibility or future use if needed, 
    // but primarily switching to the above. 
    // We might want to keep 'name' computed or as an optional field if we want to name the lot?
    // For now, adhering strictly to the 11 fields requested + id/metadata.
}

export const DEFAULT_ACCOUNTS: Account[] = [
    { id: 'acc_cash', name: 'Cash', type: 'cash' },
    { id: 'acc_upi', name: 'UPI', type: 'upi' },
    { id: 'acc_bank', name: 'Bank Account', type: 'bank' },
];
