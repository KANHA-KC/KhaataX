import { LayoutDashboard, ReceiptIndianRupee, Users, Settings as SettingsIcon, Box, Wifi, WifiOff, HardDrive } from 'lucide-react';
import { Logo } from './Logo';
import styles from './Layout.module.css';
import { useEffect, useState } from 'react';
import { useTranslation } from '../context/LanguageContext';

interface LayoutProps {
    children: React.ReactNode;
    currentView: 'dashboard' | 'transactions' | 'people' | 'settings' | 'stocks';
    onViewChange: (view: 'dashboard' | 'transactions' | 'people' | 'settings' | 'stocks') => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onViewChange }) => {
    const { t } = useTranslation();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [storageUsage, setStorageUsage] = useState<{ percent: number, isCritical: boolean } | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check storage quota
        const checkQuota = async () => {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                try {
                    const { usage, quota } = await navigator.storage.estimate();
                    if (usage !== undefined && quota !== undefined) {
                        const percent = (usage / quota) * 100;
                        setStorageUsage({
                            percent,
                            isCritical: percent > 80
                        });
                    }
                } catch (e) {
                    console.warn('Storage estimate failed', e);
                }
            }
        };

        checkQuota();
        const quotaInterval = setInterval(checkQuota, 60000); // Check every minute

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(quotaInterval);
        };
    }, []);

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <Logo />
                </div>

                <nav className={styles.nav}>
                    <button
                        className={`${styles.navItem} ${currentView === 'dashboard' ? styles.active : ''}`}
                        onClick={() => onViewChange('dashboard')}
                    >
                        <LayoutDashboard size={20} />
                        <span>{t('dashboard')}</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'transactions' ? styles.active : ''}`}
                        onClick={() => onViewChange('transactions')}
                    >
                        <ReceiptIndianRupee size={20} />
                        <span>{t('transactions')}</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'stocks' ? styles.active : ''}`}
                        onClick={() => onViewChange('stocks')}
                    >
                        <Box size={20} />
                        <span>{t('stocks')}</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'people' ? styles.active : ''}`}
                        onClick={() => onViewChange('people')}
                    >
                        <Users size={20} />
                        <span>{t('people')}</span>
                    </button>

                    <button
                        className={`${styles.navItem} ${currentView === 'settings' ? styles.active : ''}`}
                        onClick={() => onViewChange('settings')}
                    >
                        <SettingsIcon size={20} />
                        <span>{t('settings')}</span>
                    </button>
                </nav>

                <div className={styles.footer}>
                    <div className={styles.statusSection}>
                        <div className={`${styles.statusItem} ${isOnline ? styles.online : styles.offline}`}>
                            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
                            <span>{isOnline ? 'Cloud Sync Ready' : 'Offline Mode'}</span>
                        </div>
                        {storageUsage && (
                            <div className={`${styles.statusItem} ${storageUsage.isCritical ? styles.storageCritical : styles.storageNormal}`}>
                                <HardDrive size={14} />
                                <span>Storage: {storageUsage.percent.toFixed(1)}%</span>
                            </div>
                        )}
                    </div>

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
