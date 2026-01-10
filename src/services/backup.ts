import { dbService } from './db';

export interface BackupData {
    version: number;
    timestamp: number;
    description?: string;
    transactions: any[];
    people: any[];
    categories: any[];
    accounts: any[];
    stocks: any[];
}

export const backupService = {
    /**
     * Collects all data from IDB and prepares a JSON object.
     */
    createBackupData: async (): Promise<BackupData> => {
        const [transactions, people, categories, accounts, stocks] = await Promise.all([
            dbService.getAllTransactions(),
            dbService.getAllPeople(),
            dbService.getAllCategories(),
            dbService.getAllAccounts(),
            dbService.getAllStocks(),
        ]);

        return {
            version: 2,
            timestamp: Date.now(),
            transactions,
            people,
            categories,
            accounts,
            stocks
        };
    },

    /**
     * Creates a Blob from the backup data.
     */
    createBackupBlob: (data: BackupData): Blob => {
        const jsonString = JSON.stringify(data, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
    },

    /**
     * Restores data from a parsed JSON object.
     */
    restoreBackup: async (data: any): Promise<void> => {
        if (!data.version) throw new Error('Invalid backup file: Missing version');

        // Allow version 1 (missing stocks) or version 2
        const txs = data.transactions || [];
        const persons = data.people || [];
        const cats = data.categories || [];
        // const accs = data.accounts || [];
        const stocks = data.stocks || [];

        // Sequential insert/restore
        for (const t of txs) await dbService.addTransaction(t);
        for (const p of persons) await dbService.addPerson(p);
        for (const c of cats) await dbService.addCategory(c);

        // Only if stocks exist (v2)
        for (const s of stocks) await dbService.addStock(s);

        // Accounts are mostly static, but we could restore custom ones here if implemented.
        // for (const a of accs) { ... }
    }
};
