import { useState, useMemo, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { formatCurrency } from '../utils/format';
import { Search, Trash2, ArrowUpDown, Filter, X, Edit2, Plus } from 'lucide-react';
import styles from './TransactionRegister.module.css';
import { useTranslation } from '../context/LanguageContext';
import { TransliteratedInput } from './ui/TransliteratedInput';
import { normalizeForSearch } from '../utils/transliterate';
import { ExportMenu } from './ExportMenu';
import { exportToCSV, exportToPDF } from '../utils/export';
import { FilterDrawer, INITIAL_FILTERS } from './FilterDrawer';
import type { FilterState } from './FilterDrawer';
import { Button } from './ui/Button';
import { Cloud, CheckCircle } from 'lucide-react';
import { cloudBackup } from '../services/cloudBackup';
import { EditTransactionModal } from './EditTransactionModal';
import { AddTransactionModal } from './AddTransactionModal';
import type { Transaction } from '../types';

export const TransactionRegister = () => {
    const { t } = useTranslation();
    const { transactions, people, categories, accounts, deleteTransaction } = useLedger();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Consolidated Filter State
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);

    // Backup State
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [unbackedCount, setUnbackedCount] = useState(0);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    // Add Transaction State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const handleQuickBackup = async () => {
        const config = cloudBackup.getConfig();
        if (!config.isConnected) {
            alert('Please connect Google Drive in Settings first.');
            return;
        }

        setIsBackupLoading(true);
        try {
            await cloudBackup.performBackup();
            setBackupStatus('success');
            setTimeout(() => setBackupStatus('idle'), 3000);
        } catch (e) {
            setBackupStatus('error');
        } finally {
            setIsBackupLoading(false);
        }
    };

    // Sort State
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'amount' | 'payee'; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc' // Newest first by default
    });

    // Helpers
    const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || id;
    const getAccountName = (id: string) => accounts.find(a => a.id === id)?.name || id;
    const getPersonName = (id?: string) => id ? (people.find(p => p.id === id)?.name || 'Unknown') : '';

    const handleSort = (key: 'date' | 'amount' | 'payee') => {
        setSortConfig(current => ({
            key,
            direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const filteredTransactions = useMemo(() => {
        let result = transactions;

        // 1. Text Search
        if (searchTerm) {
            const lowerTerm = searchTerm.trim().toLowerCase();
            const normalizedTerm = normalizeForSearch(searchTerm);

            result = result.filter(tx => {
                const catName = getCategoryName(tx.categoryId);
                const accName = getAccountName(tx.accountId);
                const personName = getPersonName(tx.payeeId);
                const notes = tx.notes || '';

                // Standard match
                const standardMatch =
                    catName.toLowerCase().includes(lowerTerm) ||
                    accName.toLowerCase().includes(lowerTerm) ||
                    personName.toLowerCase().includes(lowerTerm) ||
                    notes.toLowerCase().includes(lowerTerm);

                if (standardMatch) return true;

                // Bilingual Phonetic Match
                return (
                    normalizeForSearch(catName).includes(normalizedTerm) ||
                    normalizeForSearch(personName).includes(normalizedTerm) ||
                    normalizeForSearch(notes).includes(normalizedTerm)
                );
            });
        }

        // 2. Type Filter
        if (activeFilters.type !== 'all') {
            result = result.filter(tx => tx.type === activeFilters.type);
        }

        // 3. Category Filter
        if (activeFilters.categories.length > 0) {
            result = result.filter(tx => activeFilters.categories.includes(tx.categoryId));
        }

        // 3.1 People Filter
        if (activeFilters.people && activeFilters.people.length > 0) {
            result = result.filter(tx => tx.payeeId && activeFilters.people.includes(tx.payeeId));
        }

        // 4. Date Range Filter
        if (activeFilters.dateRange.start) {
            result = result.filter(tx => tx.date >= activeFilters.dateRange.start);
        }
        if (activeFilters.dateRange.end) {
            result = result.filter(tx => tx.date <= activeFilters.dateRange.end);
        }

        // 5. Amount Range Filter
        if (activeFilters.amountRange.min) {
            result = result.filter(tx => tx.amount >= parseFloat(activeFilters.amountRange.min));
        }
        if (activeFilters.amountRange.max) {
            result = result.filter(tx => tx.amount <= parseFloat(activeFilters.amountRange.max));
        }

        // 6. Sorting
        return [...result].sort((a, b) => {
            let valA: any;
            let valB: any;

            if (sortConfig.key === 'payee') {
                valA = getPersonName(a.payeeId).toLowerCase();
                valB = getPersonName(b.payeeId).toLowerCase();
            } else if (sortConfig.key === 'date') {
                valA = new Date(a.date).getTime();
                valB = new Date(b.date).getTime();
            } else {
                valA = (a as any)[sortConfig.key];
                valB = (b as any)[sortConfig.key];
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [transactions, searchTerm, activeFilters, sortConfig, categories, accounts, people]);

    // Calculate unbacked entries count
    useMemo(() => {
        const lastBackupTime = localStorage.getItem('last_sync_time');
        const driveConnected = cloudBackup.getConfig().isConnected;

        if (!driveConnected || !lastBackupTime) {
            setUnbackedCount(0);
            return;
        }

        const lastBackupDate = new Date(lastBackupTime);
        const unbacked = transactions.filter(t => new Date(t.date) > lastBackupDate);
        setUnbackedCount(unbacked.length);
    }, [transactions]);

    // Summary Calculations
    const summary = useMemo(() => {
        const credit = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const debit = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        return {
            credit,
            debit,
            net: credit - debit
        };
    }, [filteredTransactions]);

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to delete this transaction?')) {
            await deleteTransaction(id);
        }
    };

    const handleEdit = (tx: Transaction) => {
        setEditingTransaction(tx);
        setIsEditModalOpen(true);
    };

    const handleEditClose = () => {
        setIsEditModalOpen(false);
        setEditingTransaction(null);
    };

    const handleExportCSV = () => exportToCSV(filteredTransactions, categories, people, 'filtered-transactions.csv');
    const handleExportPDF = () => exportToPDF(filteredTransactions, categories, people, 'filtered-transactions.pdf');

    const SortIcon = ({ column }: { column: 'date' | 'amount' | 'payee' }) => {
        if (sortConfig.key !== column) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
        return sortConfig.direction === 'asc' ? <ArrowUpDown size={14} className="transform rotate-180" /> : <ArrowUpDown size={14} />;
    };

    // Active Filter Count
    const activeFilterCount =
        (activeFilters.type !== 'all' ? 1 : 0) +
        (activeFilters.categories.length > 0 ? 1 : 0) +
        ((activeFilters.people?.length || 0) > 0 ? 1 : 0) +
        (activeFilters.dateRange.mode !== 'all' ? 1 : 0) +
        (activeFilters.amountRange.min || activeFilters.amountRange.max ? 1 : 0);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                setIsAddModalOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleRow}>
                    <h1>{t('transactions')}</h1>
                </div>

                <div className={styles.controls}>
                    {/* Search */}
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <TransliteratedInput
                            placeholder={t('search')}
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            className={styles.searchInput}
                        />
                    </div>

                    <Button
                        variant="primary"
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ height: '40px', gap: '8px' }}
                    >
                        <Plus size={16} />
                        {t('add_transaction')}
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsFilterOpen(true)}
                        style={{ height: '40px', gap: '8px' }}
                    >
                        <Filter size={16} />
                        {t('filters')}
                        {activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
                    </Button>


                    <ExportMenu onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} />

                    <Button
                        variant="ghost"
                        onClick={handleQuickBackup}
                        title={cloudBackup.getConfig().isConnected ? "Backup to Drive" : "Connect Drive in Settings"}
                        disabled={isBackupLoading}
                    >
                        {isBackupLoading ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : backupStatus === 'success' ? (
                            <CheckCircle size={18} className="text-green-500" />
                        ) : (
                            <Cloud size={18} />
                        )}
                    </Button>
                </div>
            </header>

            {/* Active Filters Row (Chips) */}
            {activeFilterCount > 0 && (
                <div className={styles.activeFiltersRow}>
                    {activeFilters.type !== 'all' && (
                        <div className={styles.activeFilterChip}>
                            Type: {activeFilters.type === 'income' ? 'Credit' : 'Debit'}
                            <X size={12} onClick={() => setActiveFilters(p => ({ ...p, type: 'all' }))} />
                        </div>
                    )}
                    {activeFilters.categories.length > 0 && (
                        <div className={styles.activeFilterChip}>
                            Categories: {activeFilters.categories.length}
                            <X size={12} onClick={() => setActiveFilters(p => ({ ...p, categories: [] }))} />
                        </div>
                    )}
                    {(activeFilters.people?.length || 0) > 0 && (
                        <div className={styles.activeFilterChip}>
                            People: {activeFilters.people.length}
                            <X size={12} onClick={() => setActiveFilters(p => ({ ...p, people: [] }))} />
                        </div>
                    )}
                    {activeFilters.dateRange.mode !== 'all' && (
                        <div className={styles.activeFilterChip}>
                            Date: {activeFilters.dateRange.mode === 'custom' ? 'Custom' : activeFilters.dateRange.mode}
                            <X size={12} onClick={() => setActiveFilters(p => ({ ...p, dateRange: INITIAL_FILTERS.dateRange }))} />
                        </div>
                    )}
                    {(activeFilters.amountRange.min || activeFilters.amountRange.max) && (
                        <div className={styles.activeFilterChip}>
                            Amount: {activeFilters.amountRange.min || '0'} - {activeFilters.amountRange.max || '∞'}
                            <X size={12} onClick={() => setActiveFilters(p => ({ ...p, amountRange: INITIAL_FILTERS.amountRange }))} />
                        </div>
                    )}
                    <button className={styles.clearFiltersBtn} onClick={() => setActiveFilters(INITIAL_FILTERS)}>
                        Clear All
                    </button>
                </div>
            )}

            {/* Unbacked Entries Warning */}
            {unbackedCount > 0 && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'hsl(38, 92%, 50%, 0.1)',
                    border: '1px solid hsl(38, 92%, 50%)',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontSize: '0.9rem',
                    color: 'hsl(38, 92%, 35%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    ⚠️ <strong>{unbackedCount}</strong> {unbackedCount === 1 ? "transaction hasn't" : "transactions haven't"} been backed up yet.
                </div>
            )}

            {/* Summary Card */}
            <div className={styles.summaryCard}>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('total_credit')}</span>
                    <span className={`${styles.summaryValue} ${styles.income}`}>
                        +{formatCurrency(summary.credit)}
                    </span>
                </div>
                <div className={styles.summaryDivider}></div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('total_debit')}</span>
                    <span className={`${styles.summaryValue} ${styles.expense}`}>
                        -{formatCurrency(summary.debit)}
                    </span>
                </div>
                <div className={styles.summaryDivider}></div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>{t('net_balance')}</span>
                    <span className={`${styles.summaryValue} ${summary.net >= 0 ? styles.income : styles.expense}`}>
                        {summary.net >= 0 ? '+' : ''}{formatCurrency(summary.net)}
                    </span>
                </div>
            </div>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th
                                style={{ width: '140px' }}
                                className={styles.sortableHeader}
                                onClick={() => handleSort('date')}
                            >
                                <div className={styles.headerContent}>
                                    {t('date')} <SortIcon column="date" />
                                </div>
                            </th>
                            <th
                                className={styles.sortableHeader}
                                onClick={() => handleSort('payee')}
                            >
                                <div className={styles.headerContent}>
                                    {t('payee')} <SortIcon column="payee" />
                                </div>
                            </th>
                            <th>{t('category')}</th>
                            <th>{t('account')}</th>
                            <th
                                className={`${styles.sortableHeader}`}
                                onClick={() => handleSort('amount')}
                            >
                                <div className={`${styles.headerContent} ${styles.headerRight}`}>
                                    {t('amount')} <SortIcon column="amount" />
                                </div>
                            </th>
                            <th style={{ width: '80px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={6} className={styles.empty}>No transactions found</td>
                            </tr>
                        ) : (
                            filteredTransactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className={styles.date}>{new Date(tx.date).toLocaleDateString()}</td>
                                    <td>
                                        <div className={styles.payee}>{getPersonName(tx.payeeId) || '—'}</div>
                                        {tx.notes && <div className={styles.notes}>{tx.notes}</div>}
                                    </td>
                                    <td>
                                        <span className={styles.badge}>
                                            {getCategoryName(tx.categoryId)}
                                        </span>
                                    </td>
                                    <td className={styles.account}>{getAccountName(tx.accountId)}</td>
                                    <td className={`${styles.amount} ${tx.type === 'income' ? styles.income : styles.expense}`}>
                                        {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                            <button
                                                className={styles.actionBtn}
                                                onClick={() => handleEdit(tx)}
                                                title="Edit transaction"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button className={styles.actionBtn} onClick={() => handleDelete(tx.id)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <EditTransactionModal
                isOpen={isEditModalOpen}
                onClose={handleEditClose}
                transaction={editingTransaction}
            />

            <AddTransactionModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={(filters) => {
                    setActiveFilters(filters);
                    setIsFilterOpen(false);
                }}
                initialFilters={activeFilters}
                availableCategories={categories}
                availablePeople={people}
            />
        </div>
    );
};
