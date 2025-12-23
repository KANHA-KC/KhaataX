import { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { formatCurrency } from '../utils/format';
import { Input } from './ui/Input';
import { Search, Trash2, ArrowUpDown, Filter, X } from 'lucide-react';
import styles from './TransactionRegister.module.css';
import { ExportMenu } from './ExportMenu';
import { exportToCSV, exportToPDF } from '../utils/export';
import { FilterDrawer, INITIAL_FILTERS } from './FilterDrawer';
import type { FilterState } from './FilterDrawer';
import { Button } from './ui/Button';
import { Cloud, CheckCircle } from 'lucide-react';
import { cloudBackup } from '../services/cloudBackup';

export const TransactionRegister = () => {
    const { transactions, people, categories, accounts, deleteTransaction } = useLedger();
    const [searchTerm, setSearchTerm] = useState('');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Consolidated Filter State
    const [activeFilters, setActiveFilters] = useState<FilterState>(INITIAL_FILTERS);

    // Backup State
    const [isBackupLoading, setIsBackupLoading] = useState(false);
    const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');

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
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(tx => {
                const catName = getCategoryName(tx.categoryId).toLowerCase();
                const accName = getAccountName(tx.accountId).toLowerCase();
                const personName = getPersonName(tx.payeeId).toLowerCase();
                const notes = (tx.notes || '').toLowerCase();
                return catName.includes(lowerTerm) || accName.includes(lowerTerm) || personName.includes(lowerTerm) || notes.includes(lowerTerm);
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
        (activeFilters.dateRange.mode !== 'all' ? 1 : 0) +
        (activeFilters.amountRange.min || activeFilters.amountRange.max ? 1 : 0);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleRow}>
                    <h1>Transactions</h1>
                </div>

                <div className={styles.controls}>
                    {/* Search */}
                    <div className={styles.searchWrapper}>
                        <Search size={18} className={styles.searchIcon} />
                        <Input
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <Button
                        variant="outline"
                        onClick={() => setIsFilterOpen(true)}
                        style={{ height: '40px', gap: '8px' }}
                    >
                        <Filter size={16} />
                        Filters
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

            {/* Summary Card */}
            <div className={styles.summaryCard}>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Total Credit</span>
                    <span className={`${styles.summaryValue} ${styles.income}`}>
                        +{formatCurrency(summary.credit)}
                    </span>
                </div>
                <div className={styles.summaryDivider}></div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Total Debit</span>
                    <span className={`${styles.summaryValue} ${styles.expense}`}>
                        -{formatCurrency(summary.debit)}
                    </span>
                </div>
                <div className={styles.summaryDivider}></div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Net Balance</span>
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
                                    Date <SortIcon column="date" />
                                </div>
                            </th>
                            <th
                                className={styles.sortableHeader}
                                onClick={() => handleSort('payee')}
                            >
                                <div className={styles.headerContent}>
                                    Payee / Notes <SortIcon column="payee" />
                                </div>
                            </th>
                            <th>Category</th>
                            <th>Account</th>
                            <th
                                className={`${styles.sortableHeader}`}
                                onClick={() => handleSort('amount')}
                            >
                                <div className={`${styles.headerContent} ${styles.headerRight}`}>
                                    Amount <SortIcon column="amount" />
                                </div>
                            </th>
                            <th style={{ width: '50px' }}></th>
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
                                        <button className={styles.actionBtn} onClick={() => handleDelete(tx.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <FilterDrawer
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={(filters) => {
                    setActiveFilters(filters);
                    setIsFilterOpen(false);
                }}
                initialFilters={activeFilters}
                availableCategories={categories}
            />
        </div>
    );
};
