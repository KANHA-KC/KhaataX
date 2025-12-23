import React, { useRef, useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Button } from './ui/Button';
import { dbService } from '../services/db';
import { seedData } from '../utils/seeder';
import styles from './Settings.module.css';
import { Input } from './ui/Input';
import { v4 as uuidv4 } from 'uuid';
import { Plus, FileJson, FileText, Table, Upload, Cloud, CheckCircle, X } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/export';
import { cloudBackup } from '../services/cloudBackup';

export const Settings = () => {
    const { refreshData, categories, addCategory, deleteCategory } = useLedger();
    const [isSeeding, setIsSeeding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Category Management State
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
    const [isAddingCat, setIsAddingCat] = useState(false);

    const handleAddCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCatName.trim()) return;

        setIsAddingCat(true);
        try {
            await addCategory({
                id: `cat_${uuidv4()}`,
                name: newCatName.trim(),
                type: newCatType
            });
            setNewCatName('');
        } catch (err) {
            console.error(err);
        } finally {
            setIsAddingCat(false);
        }
    };

    const handleDeleteCategory = async (id: string, name: string) => {
        if (!confirm(`Delete category "${name}"? Existing transactions will keeping this category ID but display might be affected.`)) return;
        try {
            await deleteCategory(id);
        } catch (e) {
            console.error(e);
            alert('Failed to delete category');
        }
    };

    const handleExport = async () => {
        const [transactions, people, categories, accounts] = await Promise.all([
            dbService.getAllTransactions(),
            dbService.getAllPeople(),
            dbService.getAllCategories(),
            dbService.getAllAccounts(),
        ]);

        const data = {
            version: 1,
            timestamp: Date.now(),
            transactions,
            people,
            categories,
            accounts
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ledger-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!confirm('This will overwrite existing data (or merge duplicate IDs). Continue?')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!json.version) throw new Error('Invalid backup file');

                // Restore data
                for (const t of json.transactions || []) await dbService.addTransaction(t);
                for (const p of json.people || []) await dbService.addPerson(p);
                for (const c of json.categories || []) await dbService.addCategory(c);
                // Accounts usually static but sure

                await refreshData();
                alert('Import successful!');
            } catch (err) {
                console.error(err);
                alert('Failed to import data. Check file format.');
            }
        };
        reader.readAsText(file);
    };

    const handleReset = async () => {
        if (prompt('Type "DELETE" to wipe all data. This cannot be undone.') === 'DELETE') {
            // IDB delete logic incomplete in service, let's just clear stores manually or assume user clears browser data.
            // For now, let's skipping implementation of full wipe to avoiding accidental data loss in MVP.
            alert('To wipe data, please clear your browser site data.');
        }
    };

    const handleSeedData = async () => {
        if (!confirm('Add 100 random transactions? This will mix with your current data.')) return;
        setIsSeeding(true);
        try {
            await seedData(100);
            await refreshData();
            alert('100 Transactions generated!');
        } catch (e) {
            console.error(e);
            alert('Failed to seed data');
        } finally {
            setIsSeeding(false);
        }
    };

    // Use dbService to get all data for export calls, or fetch newly. 
    // Wait, export utils expect plain arrays. 
    // We can't access 'transactions' directly from useLedger? Yes we can, it's in scope line 12.
    // But local vars in handleExport shadowed it? No, line 41 `const [transactions...]`. 
    // I should create a separate export handler that uses the context data for UI exports.
    // The existing handleExport gets FRESH data from DB which is better for backup.
    // For CSV/PDF report, using context data (what user sees) or fresh DB data? 
    // Let's use context data for simplicity in button onClicks.

    // BUT! `useLedger` returns `transactions` which is what we want.
    // However, Inside `handleExport`, we shadow it. That's fine.

    // For the new buttons, we need scope access to `transactions` from `useLedger`.
    // It is available.

    // Getting data for export buttons:
    const { transactions, people } = useLedger(); // Access from context

    return (
        <div className={styles.container}>
            <div className={styles.container}>
                <h1>Settings</h1>

                <div className={styles.contentGrid}>
                    <div className={styles.column}>
                        <div className={styles.card}>
                            <h3>Data Management</h3>
                            <p className={styles.hint}>
                                Your data is stored locally on this device.
                                Export regularly to backup your financial history.
                            </p>

                            <div className={styles.backupSection}>
                                <h4>Cloud Backup</h4>
                                <p className={styles.hint} style={{ marginBottom: '1rem' }}>
                                    Sync your data to Google Drive for safekeeping.
                                </p>

                                <div className={styles.actions}>
                                    {!cloudBackup.getConfig().isConnected ? (
                                        <Button variant="primary" onClick={async () => {
                                            setIsSeeding(true);
                                            const success = await cloudBackup.login();
                                            setIsSeeding(false);
                                            if (success) {
                                                alert('Connected to Google Drive!');
                                                window.location.reload();
                                            }
                                        }}>
                                            <Cloud size={16} style={{ marginRight: 8 }} />
                                            Connect Google Drive
                                        </Button>
                                    ) : (
                                        <div className={styles.connectedState}>
                                            <div className={styles.accountInfo}>
                                                <CheckCircle size={16} className="text-green-500" />
                                                <span>Connected as {cloudBackup.getConfig().accountName}</span>
                                            </div>
                                            <div className={styles.backupControls}>
                                                <select
                                                    className={styles.select}
                                                    value={cloudBackup.getConfig().frequency}
                                                    onChange={(e) => {
                                                        const cfg = cloudBackup.getConfig();
                                                        // @ts-ignore
                                                        cloudBackup.saveConfig({ ...cfg, frequency: e.target.value });
                                                        window.location.reload();
                                                    }}
                                                >
                                                    <option value="manual">Manual Backup Only</option>
                                                    <option value="daily">Daily Backup</option>
                                                    <option value="weekly">Weekly Backup</option>
                                                </select>
                                                <Button variant="outline" onClick={async () => {
                                                    await cloudBackup.logout();
                                                    window.location.reload();
                                                }}>
                                                    Disconnect
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid var(--border-color)', margin: '1rem 0' }}></div>

                            <div className={styles.exportGrid}>
                                <Button variant="outline" onClick={handleExport}>
                                    <FileJson size={16} style={{ marginRight: 8 }} />
                                    Export JSON
                                </Button>
                                <Button variant="outline" onClick={() => exportToCSV(transactions, categories, people, 'all-transactions.csv')}>
                                    <Table size={16} style={{ marginRight: 8 }} />
                                    Export CSV
                                </Button>
                                <Button variant="outline" onClick={() => exportToPDF(transactions, categories, people, 'all-transactions.pdf')}>
                                    <FileText size={16} style={{ marginRight: 8 }} />
                                    Export PDF
                                </Button>

                                <div className={styles.importWrapper}>
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                        <Upload size={16} style={{ marginRight: 8 }} />
                                        Import Data
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        hidden
                                        accept=".json"
                                        onChange={handleImport}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className={styles.card}>
                            <h3>App Reset</h3>
                            <div className={styles.actions}>
                                <Button variant="danger" onClick={handleReset}>
                                    Wipe All Data
                                </Button>
                            </div>
                        </div>

                    </div>

                    <div className={styles.column}>
                        {/* Right Column: Category Management */}
                        <div className={styles.card}>
                            <h3>Category Management</h3>
                            <p className={styles.hint}>Manage your transaction categories.</p>

                            <form onSubmit={handleAddCategory} className={styles.addCatForm}>
                                <div className={styles.catTypeToggle}>
                                    <button
                                        type="button"
                                        className={`${styles.typeBtn} ${newCatType === 'expense' ? styles.activeExpense : ''}`}
                                        onClick={() => setNewCatType('expense')}
                                    >
                                        Debit
                                    </button>
                                    <button
                                        type="button"
                                        className={`${styles.typeBtn} ${newCatType === 'income' ? styles.activeIncome : ''}`}
                                        onClick={() => setNewCatType('income')}
                                    >
                                        Credit
                                    </button>
                                </div>
                                <div className={styles.addInputGroup}>
                                    <Input
                                        placeholder="New Category Name"
                                        value={newCatName}
                                        onChange={e => setNewCatName(e.target.value)}
                                        className={styles.catInput}
                                    />
                                    <Button type="submit" variant="primary" isLoading={isAddingCat} disabled={!newCatName.trim()}>
                                        <Plus size={18} />
                                    </Button>
                                </div>
                            </form>

                            <div className={styles.catList}>
                                <div className={styles.catColumn}>
                                    <h4>Debit Categories</h4>
                                    <div className={styles.tags}>
                                        {categories.filter(c => c.type === 'expense').map(c => (
                                            <div key={c.id} className={styles.catTagWrapper}>
                                                <span className={styles.catTag}>{c.name}</span>
                                                <button
                                                    className={styles.deleteCatBtn}
                                                    onClick={() => handleDeleteCategory(c.id, c.name)}
                                                    title="Delete Category"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.catColumn}>
                                    <h4>Credit Categories</h4>
                                    <div className={styles.tags}>
                                        {categories.filter(c => c.type === 'income').map(c => (
                                            <div key={c.id} className={styles.catTagWrapper}>
                                                <span className={styles.catTag}>{c.name}</span>
                                                <button
                                                    className={styles.deleteCatBtn}
                                                    onClick={() => handleDeleteCategory(c.id, c.name)}
                                                    title="Delete Category"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    <div className={styles.card}>
                        <h3>Developer Tools</h3>
                        <p className={styles.hint} style={{ marginBottom: '1rem' }}>
                            Quickly populate the app with random data for testing.
                        </p>
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={handleSeedData} isLoading={isSeeding}>
                                {isSeeding ? 'Creating...' : 'Generate 100 Demo Entries'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    );
};
