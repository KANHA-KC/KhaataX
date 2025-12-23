import React from 'react';
import { LayoutDashboard, ReceiptIndianRupee, Users, Settings as SettingsIcon, Box } from 'lucide-react';
import styles from './Layout.module.css';

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'transactions' | 'people' | 'settings' | 'stocks';
    onViewChange: (view: 'dashboard' | 'transactions' | 'people' | 'settings' | 'stocks') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <h2>Ledger</h2>
                </div>

                <nav className={styles.nav}>
                    <button
                        className={`${styles.navItem} ${currentView === 'dashboard' ? styles.active : ''}`}
                        onClick={() => onViewChange('dashboard')}
                    >
                        <LayoutDashboard size={20} />
                        <span>Dashboard</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'transactions' ? styles.active : ''}`}
                        onClick={() => onViewChange('transactions')}
                    >
                        <ReceiptIndianRupee size={20} />
                        <span>Transactions</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'stocks' ? styles.active : ''}`}
                        onClick={() => onViewChange('stocks')}
                    >
                        <Box size={20} />
                        <span>Stocks</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'people' ? styles.active : ''}`}
                        onClick={() => onViewChange('people')}
                    >
                        <Users size={20} />
                        <span>People</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'settings' ? styles.active : ''}`}
                        onClick={() => onViewChange('settings')}
                    >
                        <SettingsIcon size={20} />
                        <span>Settings</span>
                    </button>
                </nav>

                <div className={styles.footer}>
                    <div className={styles.user}>
                        <div className={styles.avatar}>
                            {localStorage.getItem('ledger_user_name')?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className={styles.userName}>{localStorage.getItem('ledger_user_name') || 'User'}</span>
                    </div>
                </div>
            </aside>

            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
};
