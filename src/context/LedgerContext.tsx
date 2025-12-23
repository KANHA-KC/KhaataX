import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dbService } from '../services/db';
import type { Transaction, Person, Category, Account, StockItem } from '../types';

interface LedgerContextType {
    transactions: Transaction[];
    people: Person[];
    categories: Category[];
    accounts: Account[];
    stocks: StockItem[];
    isLoading: boolean;
    refreshData: () => Promise<void>;
    addTransaction: (tx: Transaction) => Promise<void>;
    updateTransaction: (tx: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
    addPerson: (person: Person) => Promise<void>;
    addCategory: (category: Category) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    addStock: (item: StockItem) => Promise<void>;
    updateStock: (item: StockItem) => Promise<void>;
    deleteStock: (id: string) => Promise<void>;
}

const LedgerContext = createContext<LedgerContextType | undefined>(undefined);

export function LedgerProvider({ children }: { children: React.ReactNode }) {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const refreshData = useCallback(async () => {
        try {
            const [txs, ppl, cats, accs, stks] = await Promise.all([
                dbService.getAllTransactions(),
                dbService.getAllPeople(),
                dbService.getAllCategories(),
                dbService.getAllAccounts(),
                dbService.getAllStocks(),
            ]);
            // Sort transactions by date desc by default
            setTransactions(txs.reverse());
            setPeople(ppl);
            setCategories(cats);
            setAccounts(accs);
            setStocks(stks);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const addTransaction = async (tx: Transaction) => {
        await dbService.addTransaction(tx);
        await refreshData();
    };

    const updateTransaction = async (tx: Transaction) => {
        await dbService.updateTransaction(tx);
        await refreshData();
    };

    const deleteTransaction = async (id: string) => {
        await dbService.deleteTransaction(id);
        await refreshData();
    };

    const addPerson = async (person: Person) => {
        await dbService.addPerson(person);
        await refreshData();
    };

    const addCategory = async (category: Category) => {
        await dbService.addCategory(category);
        await refreshData();
    };

    const deleteCategory = async (id: string) => {
        await dbService.deleteCategory(id);
        await refreshData();
    };

    // --- Stocks ---
    const [stocks, setStocks] = useState<StockItem[]>([]);

    const addStock = async (item: StockItem) => {
        await dbService.addStock(item);
        await refreshData();
    };

    const updateStock = async (item: StockItem) => {
        await dbService.updateStock(item);
        await refreshData();
    };

    const deleteStock = async (id: string) => {
        await dbService.deleteStock(id);
        await refreshData();
    };

    return (
        <LedgerContext.Provider value={{
            transactions,
            people,
            categories,
            accounts,
            stocks,
            isLoading,
            refreshData,
            addTransaction,
            updateTransaction,
            deleteTransaction,
            addPerson,
            addCategory,
            deleteCategory,
            addStock,
            updateStock,
            deleteStock
        }}>
            {children}
        </LedgerContext.Provider>
    );
}

export function useLedger() {
    const context = useContext(LedgerContext);
    if (context === undefined) {
        throw new Error('useLedger must be used within a LedgerProvider');
    }
    return context;
}
