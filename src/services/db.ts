import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import { DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS } from '../types';
import type { Transaction, Person, Category, Account, StockItem } from '../types';

interface LedgerDB extends DBSchema {
    transactions: {
        key: string;
        value: Transaction;
        indexes: { 'by-date': string; 'by-person': string };
    };
    people: {
        key: string;
        value: Person;
    };
    categories: {
        key: string;
        value: Category;
    };
    accounts: {
        key: string;
        value: Account;
    };
    stocks: {
        key: string;
        value: StockItem;
    };
}

const DB_NAME = 'ledger-db';
const DB_VERSION = 2; // Increment version for new store

export class StorageService {
    private dbPromise: Promise<IDBPDatabase<LedgerDB>>;

    constructor() {
        this.dbPromise = openDB<LedgerDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Transactions store
                if (!db.objectStoreNames.contains('transactions')) {
                    const store = db.createObjectStore('transactions', { keyPath: 'id' });
                    store.createIndex('by-date', 'date');
                    store.createIndex('by-person', 'payeeId');
                }

                // People store
                if (!db.objectStoreNames.contains('people')) {
                    db.createObjectStore('people', { keyPath: 'id' });
                }

                // Categories store
                if (!db.objectStoreNames.contains('categories')) {
                    const store = db.createObjectStore('categories', { keyPath: 'id' });
                    // Seed defaults
                    DEFAULT_CATEGORIES.forEach(cat => store.put(cat));
                }

                // Accounts store
                if (!db.objectStoreNames.contains('accounts')) {
                    const store = db.createObjectStore('accounts', { keyPath: 'id' });
                    // Seed defaults
                    DEFAULT_ACCOUNTS.forEach(acc => store.put(acc));
                }

                // Stocks store (New in v2)
                if (!db.objectStoreNames.contains('stocks')) {
                    db.createObjectStore('stocks', { keyPath: 'id' });
                }
            },
        });
    }

    // --- Transactions ---
    async addTransaction(tx: Transaction) {
        return (await this.dbPromise).put('transactions', tx);
    }

    async getAllTransactions() {
        return (await this.dbPromise).getAllFromIndex('transactions', 'by-date');
    }

    async getTransactionsByPerson(personId: string) {
        return (await this.dbPromise).getAllFromIndex('transactions', 'by-person', personId);
    }

    async deleteTransaction(id: string) {
        return (await this.dbPromise).delete('transactions', id);
    }

    async updateTransaction(tx: Transaction) {
        return (await this.dbPromise).put('transactions', tx);
    }

    // --- People ---
    async addPerson(person: Person) {
        return (await this.dbPromise).put('people', person);
    }

    async getAllPeople() {
        return (await this.dbPromise).getAll('people');
    }

    async getPerson(id: string) {
        return (await this.dbPromise).get('people', id);
    }

    // --- Categories ---
    async getAllCategories() {
        return (await this.dbPromise).getAll('categories');
    }

    async addCategory(cat: Category) {
        return (await this.dbPromise).put('categories', cat);
    }

    async deleteCategory(id: string) {
        return (await this.dbPromise).delete('categories', id);
    }

    // --- Accounts ---
    async getAllAccounts() {
        return (await this.dbPromise).getAll('accounts');
    }

    // --- Stocks ---
    async getAllStocks() {
        return (await this.dbPromise).getAll('stocks');
    }

    async addStock(item: StockItem) {
        return (await this.dbPromise).put('stocks', item);
    }

    async updateStock(item: StockItem) {
        return (await this.dbPromise).put('stocks', item);
    }

    async deleteStock(id: string) {
        return (await this.dbPromise).delete('stocks', id);
    }

    // --- Clear All Data ---
    async clearAllData() {
        const db = await this.dbPromise;
        const tx = db.transaction(['transactions', 'people', 'categories', 'stocks'], 'readwrite');

        await Promise.all([
            tx.objectStore('transactions').clear(),
            tx.objectStore('people').clear(),
            tx.objectStore('categories').clear(),
            tx.objectStore('stocks').clear(),
        ]);

        await tx.done;

        // Re-seed default categories
        for (const cat of DEFAULT_CATEGORIES) {
            await this.addCategory(cat);
        }
    }

    async checkIntegrity(): Promise<boolean> {
        try {
            const db = await this.dbPromise;
            const stores: Array<"transactions" | "people" | "categories" | "accounts" | "stocks"> = ['transactions', 'people', 'categories', 'accounts', 'stocks'];
            for (const store of stores) {
                if (!db.objectStoreNames.contains(store)) {
                    console.error(`Integrity Check Failed: Missing store ${store}`);
                    return false;
                }
            }
            // Basic read check
            db.transaction('transactions', 'readonly');
            return true;
        } catch (e) {
            console.error('Integrity Check Failed:', e);
            return false;
        }
    }
}

export const dbService = new StorageService();
