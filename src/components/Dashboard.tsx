import React, { useMemo, useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { formatCurrency } from '../utils/format'; // Will create this utility
import { Plus, TrendingUp, TrendingDown, Users, Sparkles, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useInsights } from '../hooks/useInsights';
import { Button } from './ui/Button';
import { AddTransactionModal } from './AddTransactionModal';
import styles from './Dashboard.module.css';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';
import { useTranslation } from '../context/LanguageContext';

interface DashboardProps {
    onNavigate: (view: 'dashboard' | 'transactions' | 'people') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
    const { t } = useTranslation();
    const { transactions, people, categories } = useLedger();
    const [showAddModal, setShowAddModal] = useState(false);

    const isBackupOld = useMemo(() => {
        const lastSync = localStorage.getItem('last_sync_time');
        if (!lastSync) return true;

        try {
            const lastDate = new Date(lastSync);
            const diffDays = (new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24);
            return diffDays > 7;
        } catch (e) {
            return true;
        }
    }, []);

    // --- Metrics Calculation ---
    const currentMonthMetrics = useMemo(() => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        const thisMonthTxs = transactions.filter(tx =>
            isWithinInterval(parseISO(tx.date), { start, end })
        );

        const spent = thisMonthTxs
            .filter(tx => tx.type === 'expense')
            .reduce((acc, tx) => acc + tx.amount, 0);

        const income = thisMonthTxs
            .filter(tx => tx.type === 'income')
            .reduce((acc, tx) => acc + tx.amount, 0);

        return { spent, income };
    }, [transactions]);

    // "Net Owed" calculation (simplified for dashboard)
    // Positive means you owe (bad? or good? "Net balance (You owe / They owe)")
    // Usually: You Owe = negative, They Owe = positive.
    // Actually, let's sum up all 'transfer' or person-tagged transactions.
    // Ideally this should come from a helper, but doing raw calc here for speed.
    // This needs robust logic in `useLedger` or a specialized hook, but quick calc here:

    // Wait, if I pay someone expense, is it "I paid for them" (They Owe Me) 
    // or "I paid them back" (Settlement)?
    // MVP Definition: "For each person: Total paid by you, Total received, Net balance"

    // Let's stick to simple dashboard stats for now.

    const recentTransactions = useMemo(() => {
        return [...transactions]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 5);
    }, [transactions]);

    const topCategories = useMemo(() => {
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        const expenses = transactions
            .filter(t => t.type === 'expense')
            .filter(t => isWithinInterval(parseISO(t.date), { start, end }));

        const catMap = new Map<string, number>();
        expenses.forEach(t => {
            const current = catMap.get(t.categoryId) || 0;
            catMap.set(t.categoryId, current + t.amount);
        });

        const sorted = Array.from(catMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        const max = sorted.length > 0 ? sorted[0][1] : 1;

        return sorted.map(([id, amount]) => {
            const cat = categories.find(c => c.id === id);
            return {
                name: cat ? cat.name : 'Unknown',
                amount,
                percentage: (amount / max) * 100
            };
        });
    }, [transactions, categories]);

    const insights = useInsights();
    // Vibrant colors matching the reference image style (Orange, Green, Blue, Light Blue)
    const COLORS = ['#ff6b00', '#82ca9d', '#8884d8', '#00C49F', '#FFBB28', '#FF8042'];

    return (
        <div className={styles.dashboard}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>{t('dashboard')}</h1>
                    <p className={styles.subtitle}>Overview for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>
                <Button variant="primary" onClick={() => setShowAddModal(true)} size="lg">
                    <Plus size={18} style={{ marginRight: 8 }} />
                    {t('add_transaction')}
                </Button>
            </header>

            {isBackupOld && (
                <div className={styles.backupAlert} onClick={() => onNavigate('settings' as any)}>
                    <AlertTriangle size={18} />
                    <span>You haven't backed up your data recently. <strong>Secure your data now.</strong></span>
                </div>
            )}

            <div className={styles.grid}>
                {/* Metric Cards */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardLabel}>{t('total_debit')}</span>
                        <div className={`${styles.iconBox} ${styles.danger}`}>
                            <TrendingDown size={20} />
                        </div>
                    </div>
                    <div className={styles.cardValue}>
                        {formatCurrency(currentMonthMetrics.spent)}
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardLabel}>{t('total_credit')}</span>
                        <div className={`${styles.iconBox} ${styles.success}`}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div className={styles.cardValue}>
                        {formatCurrency(currentMonthMetrics.income)}
                    </div>
                </div>

                {/* People Quick View */}
                <div className={styles.card} onClick={() => onNavigate('people')} style={{ cursor: 'pointer' }}>
                    <div className={styles.cardHeader}>
                        <span className={styles.cardLabel}>People</span>
                        <div className={`${styles.iconBox} ${styles.primary}`}>
                            <Users size={20} />
                        </div>
                    </div>
                    <div className={styles.cardValue} style={{ fontSize: '1rem', color: 'var(--color-primary)' }}>
                        View Balances →
                    </div>
                </div>
            </div>

            <div className={styles.gridTwoColumn}>
                {/* Split Section: Top Spending (Left) + AI Insights (Right) */}
                <div className={styles.splitSection}>
                    {/* Left: Chart */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3>Top Spending</h3>
                        </div>
                        <div className={styles.chartContainer}>
                            {topCategories.length === 0 ? (
                                <div className={styles.emptyState}>No expenses this month.</div>
                            ) : (
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={topCategories}
                                                innerRadius={70}
                                                outerRadius={110}
                                                paddingAngle={5}
                                                cornerRadius={8}
                                                dataKey="amount"
                                                stroke="none"
                                            >
                                                {topCategories.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value: number | undefined) => [formatCurrency(value || 0), 'Amount']}
                                                contentStyle={{
                                                    backgroundColor: 'hsl(var(--bg-surface))',
                                                    borderColor: 'hsl(var(--border-color))',
                                                    color: 'hsl(var(--color-text))',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                                }}
                                                itemStyle={{ color: 'hsl(var(--color-text))' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: AI Suggestions */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h3>Gemini Smart Insights</h3>
                            <Sparkles size={16} className={styles.robotIcon} />
                        </div>
                        <div className={styles.insightPanel}>
                            {insights.map(insight => (
                                <div key={insight.id} className={`${styles.insightCard} ${styles[insight.type]}`}>
                                    <div className={styles.insightContent}>
                                        <h4>{insight.title}</h4>
                                        <p dangerouslySetInnerHTML={{ __html: insight.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}></p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h3>Recent Transactions</h3>
                        <Button variant="ghost" size="sm" onClick={() => onNavigate('transactions')}>View All</Button>
                    </div>
                    <div className={styles.transactionList}>
                        {recentTransactions.length === 0 ? (
                            <div className={styles.emptyState}>No transactions yet. Start adding!</div>
                        ) : (
                            recentTransactions.map(tx => {
                                const cat = categories.find(c => c.id === tx.categoryId);
                                return (
                                    <div key={tx.id} className={styles.transactionRow}>
                                        <div className={styles.txInfo}>
                                            <div className={styles.txMain}>
                                                <span className={styles.payee}>{people.find(p => p.id === tx.payeeId)?.name || tx.notes || cat?.name || 'Transaction'}</span>
                                            </div>
                                            <div className={styles.txSub}>
                                                <span className={styles.date}>{new Date(tx.date).toLocaleDateString()}</span>
                                                <span className={styles.cat}>{cat?.name}</span>
                                            </div>
                                        </div>
                                        <div className={`${styles.txAmount} ${tx.type === 'income' ? styles.textSuccess : ''}`}>
                                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {showAddModal && (
                <AddTransactionModal
                    isOpen={showAddModal}
                    onClose={() => setShowAddModal(false)}
                />
            )}
        </div>
    );
};
