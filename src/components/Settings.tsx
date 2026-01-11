import React, { useRef, useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Button } from './ui/Button';
import { seedData } from '../utils/seeder';
import styles from './Settings.module.css';
import { Input } from './ui/Input';
import { v4 as uuidv4 } from 'uuid';
import { Plus, FileJson, FileText, Table, Upload, Cloud, X, Languages } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/export';
import { googleDriveService } from '../services/googleDrive';
import { backupService } from '../services/backup';
import { autoBackupService, type AutoBackupFrequency } from '../services/autoBackup';
import { dbService } from '../services/db';
import { localBackupService } from '../services/localBackup';
import { useTranslation } from '../context/LanguageContext';
import { GOOGLE_CLIENT_ID } from '../config';
import { googleDriveDesktopService } from '../services/googleDriveDesktop';
import { localBackupService as simpleBackupService } from '../services/simpleBackup';

export const Settings = () => {
    const { t, language, setLanguage } = useTranslation();
    const { refreshData, categories, addCategory, deleteCategory, transactions, people } = useLedger();
    const [isSeeding, setIsSeeding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Google Drive State
    const [driveConnected, setDriveConnected] = useState(false);
    // Client ID is now loaded from config, not state/local storage
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<string>(localStorage.getItem('last_sync_time') || 'Never');
    const [backupSize, setBackupSize] = useState<string>('Unknown');
    const [backupFrequency, setBackupFrequency] = useState<AutoBackupFrequency>(autoBackupService.getFrequency());
    const [accountEmail, setAccountEmail] = useState<string | null>(null);

    // Category Management State
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
    const [isAddingCat, setIsAddingCat] = useState(false);

    // Backup List State
    const [backupFiles, setBackupFiles] = useState<any[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [unbackedCount, setUnbackedCount] = useState(0);

    // Local Backup State
    const [lastLocalBackup, setLastLocalBackup] = useState(localStorage.getItem('last_local_backup_time') || 'Never');
    const [lastLocalPath, setLastLocalPath] = useState(localStorage.getItem('last_local_backup_path') || '');
    const [isLocalBackingUp, setIsLocalBackingUp] = useState(false);
    const [isTauri, setIsTauri] = useState(false);

    // Simple Backup State
    const [backupPath, setBackupPath] = useState<string>('');
    const [lastSimpleBackup, setLastSimpleBackup] = useState<string>('Never');
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);

    useEffect(() => {
        setIsTauri(!!(window as any).__TAURI_INTERNALS__);

        // Load backup path
        if (!!(window as any).__TAURI_INTERNALS__) {
            simpleBackupService.getBackupPath().then(setBackupPath).catch(console.error);
        }
    }, []);

    useEffect(() => {
        const initDrive = async () => {
            if (googleDriveService.restoreSession()) {
                setAccountEmail('Connected Account');
                setDriveConnected(true);
                loadBackupFiles();
            }

            if (GOOGLE_CLIENT_ID) {
                try {
                    await googleDriveService.initClient({ clientId: GOOGLE_CLIENT_ID });
                } catch (error) {
                    console.error('Drive init failed:', error);
                }
            }

            try {
                const data = await backupService.createBackupData();
                const blob = backupService.createBackupBlob(data);
                const sizeMB = blob.size / (1024 * 1024);
                setBackupSize(sizeMB < 0.1 ? '~100 KB' : `${sizeMB.toFixed(1)} MB`);
            } catch (e) {
                console.error('Size calc failed', e);
            }
        };
        initDrive();
    }, []);

    const loadBackupFiles = async () => {
        setIsLoadingBackups(true);
        try {
            const files = await googleDriveService.listBackupFiles();
            setBackupFiles(files);
        } catch (error) {
            console.error('Failed to load backups:', error);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const calculateUnbackedCount = () => {
        const lastBackupTime = localStorage.getItem('last_sync_time');
        if (!lastBackupTime) {
            setUnbackedCount(transactions.length);
            return;
        }

        const lastBackupDate = new Date(lastBackupTime);
        const unbacked = transactions.filter(t => new Date(t.date) > lastBackupDate);
        setUnbackedCount(unbacked.length);
    };

    useEffect(() => {
        if (driveConnected) {
            calculateUnbackedCount();
        }
    }, [transactions, driveConnected]);

    const handleCreateSimpleBackup = async () => {
        if (!isTauri) {
            alert('Local backups only work in the desktop app');
            return;
        }

        setIsCreatingBackup(true);
        try {
            const backupData = {
                transactions,
                categories,
                people,
                settings: {
                    currency: localStorage.getItem('ledger_currency'),
                    userName: localStorage.getItem('ledger_user_name'),
                    language
                }
            };

            const filename = await simpleBackupService.createBackup(backupData);
            setLastSimpleBackup(new Date().toLocaleString());
            alert(`✅ Backup created successfully!\n\nFile: ${filename}`);
        } catch (error: any) {
            console.error('Backup error:', error);
            alert(`❌ Backup failed: ${error.message || 'Unknown error'}`);
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleOpenBackupFolder = async () => {
        if (!isTauri) {
            alert('This feature only works in the desktop app');
            return;
        }

        try {
            await simpleBackupService.openBackupFolder();
        } catch (error: any) {
            console.error('Failed to open folder:', error);
            alert(`❌ Failed to open folder: ${error.message || 'Unknown error'}`);
        }
    };

    const handleDriveConnect = async () => {
        if (!GOOGLE_CLIENT_ID) {
            alert('Configuration Error: Google Client ID is missing. Please check .env file.');
            return;
        }
        if (isTauri) {
            // Desktop: Use device code flow
            setIsAuthorizing(true);
            try {
                const { userCode } = await googleDriveDesktopService.authorize();
                setDesktopUserCode(userCode);

                // Poll for completion
                const checkAuth = setInterval(() => {
                    if (googleDriveDesktopService.isAuthenticated()) {
                        clearInterval(checkAuth);
                        setIsAuthorizing(false);
                        setDesktopUserCode('');
                        setDriveConnected(true);
                        setAccountEmail('Connected Account');
                        localStorage.setItem('drive_connected_status', 'true');
                        alert('✅ Google Drive connected successfully!');
                    }
                }, 2000);
                // Timeout after 5 minutes
                setTimeout(() => {
                    clearInterval(checkAuth);
                    if (!googleDriveDesktopService.isAuthenticated()) {
                        setIsAuthorizing(false);
                        setDesktopUserCode('');
                        alert('❌ Authorization timeout. Please try again.');
                    }
                }, 300000);
            } catch (error: any) {
                console.error('Desktop auth error:', error);
                setIsAuthorizing(false);
                setDesktopUserCode('');
                alert(`❌ Connection failed: ${error.message}`);
            }
        } else {
            // Web: Use existing popup flow
            try {
                await googleDriveService.initClient({ clientId: GOOGLE_CLIENT_ID });
                const token = await googleDriveService.signIn();
                if (token) {
                    setAccountEmail('Connected Account');
                    setDriveConnected(true);
                    localStorage.setItem('drive_connected_status', 'true');
                }
            } catch (error: any) {
                console.error('Drive connection error:', error);
                alert(`Connection failed: ${error.message || JSON.stringify(error)}`);
            }
        }
    };

    const handleDriveDisconnect = async () => {
        await googleDriveService.signOut();
        setDriveConnected(false);
        setAccountEmail(null);
        localStorage.removeItem('drive_connected_status');
    };

    const [lastBackupLink, setLastBackupLink] = useState<string | null>(localStorage.getItem('last_backup_link'));

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            const data = await backupService.createBackupData();
            const blob = backupService.createBackupBlob(data);
            const filename = `khaatax-backup-${new Date().toISOString().split('T')[0]}.json`;

            const file = await googleDriveService.uploadFile(blob, filename);

            const now = new Date().toLocaleString();
            setLastSyncTime(now);
            localStorage.setItem('last_sync_time', now);
            localStorage.setItem('last_backup_timestamp', Date.now().toString());

            if (file.webViewLink) {
                setLastBackupLink(file.webViewLink);
                localStorage.setItem('last_backup_link', file.webViewLink);
            }

            alert('Backup successful!');
            setDriveConnected(true);
            setAccountEmail('Connected Account');
            await loadBackupFiles();
        } catch (error: any) {
            console.error('Sync error:', error);
            alert(`Sync failed: ${error.message}`);
        } finally {
            setIsSyncing(false);
        }
    };

    const handleLocalBackup = async () => {
        setIsLocalBackingUp(true);
        try {
            const path = await localBackupService.performLocalBackup();
            if (path) {
                setLastLocalBackup(new Date().toLocaleString());
                setLastLocalPath(path);
                alert(`Backup saved successfully to Documents folder!`);
            } else {
                alert('Local backup failed. Are you running the desktop version?');
            }
        } catch (error) {
            console.error(error);
            alert('Local backup failed.');
        } finally {
            setIsLocalBackingUp(false);
        }
    };

    const handleRestoreBackup = async (fileId: string, fileName: string) => {
        if (!confirm(`Restore from backup "${fileName}"? This will overwrite your current data.`)) return;
        setIsRestoring(true);
        try {
            const data = await googleDriveService.downloadFile(fileId);
            await backupService.restoreBackup(data);
            await refreshData();
            alert('Backup restored successfully!');
            window.location.reload();
        } catch (error: any) {
            console.error('Restore error:', error);
            alert(`Restore failed: ${error.message}`);
        } finally {
            setIsRestoring(false);
        }
    };

    const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value as AutoBackupFrequency;
        setBackupFrequency(val);
        autoBackupService.setFrequency(val);
    };

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
        if (!confirm(`Delete category "${name}"?`)) return;
        try {
            await deleteCategory(id);
        } catch (e) {
            console.error(e);
            alert('Failed to delete category');
        }
    };

    const handleExport = async () => {
        const data = await backupService.createBackupData();
        const blob = backupService.createBackupBlob(data);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `khaatax-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm('This will overwrite existing data. Continue?')) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                await backupService.restoreBackup(json);
                await refreshData();
                alert('Import successful!');
            } catch (err) {
                console.error(err);
                alert('Failed to import data.');
            }
        };
        reader.readAsText(file);
    };

    const handleReset = async () => {
        if (prompt('Type "DELETE" to wipe all data.') === 'DELETE') {
            try {
                await dbService.clearAllData();
                localStorage.removeItem('last_sync_time');
                localStorage.removeItem('last_backup_link');
                localStorage.removeItem('drive_connected_status');
                await refreshData();
                alert('All data has been wiped.');
                window.location.reload();
            } catch (error) {
                console.error('Failed to wipe data:', error);
            }
        }
    };

    const handleSeedData = async () => {
        if (!confirm('Add 100 random transactions?')) return;
        setIsSeeding(true);
        try {
            await seedData(100);
            await refreshData();
            alert('100 Transactions generated!');
        } catch (e) {
            console.error(e);
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className={styles.container}>
            <h1>{t('settings')}</h1>

            <div className={styles.contentGrid}>
                <div className={styles.column}>

                    {/* Language Selection */}
                    <div className={styles.card}>
                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Languages size={20} />
                            {t('language')}
                        </h3>
                        <div className={styles.languageToggle}>
                            <button
                                className={`${styles.langBtn} ${language === 'en' ? styles.activeLang : ''}`}
                                onClick={() => setLanguage('en')}
                            >
                                {t('english')}
                            </button>
                            <button
                                className={`${styles.langBtn} ${language === 'hi' ? styles.activeLang : ''}`}
                                onClick={() => setLanguage('hi')}
                            >
                                {t('hindi')}
                            </button>
                        </div>
                    </div>

                    {/* Data Backup */}
                    <div className={styles.card}>
                        <h3>{t('backup_sync')}</h3>
                        <p className={styles.hint}>Secure your data with cloud and local backups.</p>

                        {isTauri && (
                            <div className={styles.localBackupSection}>
                                <div className={styles.waSection}>
                                    <div className={styles.waLabel}>Local Machine Backup:</div>
                                    <div className={styles.waValue}>{lastLocalBackup}</div>
                                </div>
                                {lastLocalPath && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
                                        Path: {lastLocalPath}
                                    </div>
                                )}
                                <button className={styles.waButton} style={{ backgroundColor: 'var(--color-primary)', marginBottom: '1.5rem' }} onClick={handleLocalBackup} disabled={isLocalBackingUp}>
                                    {isLocalBackingUp ? 'Saving...' : 'Backup to Documents'}
                                </button>
                                <hr style={{ border: 0, borderTop: '1px solid var(--border-color)', marginBottom: '1.5rem' }} />
                            </div>
                        )}

                        <div className={styles.waContainer}>
                            {/* Unbacked Entries Warning */}
                            {driveConnected && unbackedCount > 0 && (
                                <div style={{
                                    padding: '0.75rem',
                                    background: 'hsl(38, 92%, 50%, 0.1)',
                                    border: '1px solid hsl(38, 92%, 50%)',
                                    borderRadius: '6px',
                                    marginBottom: '1rem',
                                    fontSize: '0.9rem',
                                    color: 'hsl(38, 92%, 35%)'
                                }}>
                                    ⚠️ You have <strong>{unbackedCount}</strong> {unbackedCount === 1 ? 'entry' : 'entries'} that haven't been backed up yet.
                                </div>
                            )}

                            <div className={styles.waSection}>
                                <div className={styles.waLabel}>Last Backup:</div>
                                <div className={styles.waValue}>
                                    {lastSyncTime}
                                    {lastBackupLink && (
                                        <a href={lastBackupLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', marginLeft: '0.5rem', color: '#25D366', textDecoration: 'none' }}>
                                            (View file)
                                        </a>
                                    )}
                                </div>
                            </div>
                            <hr style={{ border: 0, borderTop: '1px solid var(--border-color)' }} />
                            <div className={styles.waSection}>
                                <div className={styles.waLabel}>Size:</div>
                                <div className={styles.waValue}>{backupSize}</div>
                            </div>

                            <button className={styles.waButton} onClick={handleSync} disabled={isSyncing || !driveConnected}>
                                {isSyncing ? 'Backing up...' : 'Back up'}
                            </button>

                            <div className={styles.waAccountRow}>
                                <Cloud className={styles.waIcon} />
                                <div style={{ flex: 1 }}>
                                    <div className={styles.waLabel}>Google Account</div>
                                    <div className={styles.waValue}>{driveConnected ? (accountEmail || 'Connected') : 'Not connected'}</div>
                                </div>
                                {driveConnected && (
                                    <button className={styles.waDisconnectBtn} onClick={handleDriveDisconnect}>
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <div className={styles.waSection}>
                                <div className={styles.waLabel} style={{ marginBottom: '0.5rem' }}>Automatic backups</div>
                                <select
                                    className={styles.freqSelect}
                                    value={backupFrequency}
                                    onChange={handleFrequencyChange}
                                    disabled={!driveConnected}
                                >
                                    <option value="off">Off</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>

                            {/* Backup History */}
                            {driveConnected && (
                                <div style={{ marginTop: '1rem' }}>
                                    <div className={styles.waLabel} style={{ marginBottom: '0.75rem' }}>
                                        Available Backups {isLoadingBackups && '(Loading...)'}
                                    </div>
                                    {backupFiles.length === 0 && !isLoadingBackups && (
                                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                                            No backups found. Click "Back up" to create one.
                                        </p>
                                    )}
                                    {backupFiles.map((file, idx) => (
                                        <div key={file.id} style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '0.75rem',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: '6px',
                                            marginBottom: '0.5rem'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                                                    Backup {idx + 1}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                                    {new Date(file.createdTime).toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRestoreBackup(file.id, file.name)}
                                                disabled={isRestoring}
                                                style={{
                                                    padding: '0.4rem 0.8rem',
                                                    background: 'var(--accent)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    cursor: isRestoring ? 'not-allowed' : 'pointer',
                                                    opacity: isRestoring ? 0.6 : 1
                                                }}
                                            >
                                                {isRestoring ? 'Restoring...' : 'Restore'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Config Section for Client ID - Removed Custom Input */}
                            {!driveConnected && (
                                <div style={{ marginTop: '1rem' }}>
                                    {isTauri && isAuthorizing && desktopUserCode && (
                                        <div style={{
                                            padding: '1rem',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: '8px',
                                            marginBottom: '1rem',
                                            border: '2px solid var(--accent)'
                                        }}>
                                            <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                                                Authorization in Progress
                                            </div>
                                            <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                                                1. Browser should have opened automatically<br />
                                                2. Sign in to your Google account<br />
                                                3. Enter this code when prompted:
                                            </div>
                                            <div style={{
                                                padding: '1rem',
                                                background: 'var(--bg-app)',
                                                borderRadius: '6px',
                                                textAlign: 'center',
                                                fontFamily: 'monospace',
                                                fontSize: '1.5rem',
                                                fontWeight: 'bold',
                                                letterSpacing: '0.2em',
                                                color: 'var(--accent)'
                                            }}>
                                                {desktopUserCode}
                                            </div>
                                            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                                                Waiting for authorization...
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        style={{ width: '100%' }}
                                        onClick={handleDriveConnect}
                                        disabled={isAuthorizing}
                                    >
                                        <Cloud size={16} style={{ marginRight: '8px' }} />
                                        {isAuthorizing ? 'Authorizing...' : 'Connect Google Drive'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>


                </div>

                <div className={styles.column}>
                    {/* Category Management */}
                    <div className={styles.card}>
                        <h3>Category Management</h3>
                        <form onSubmit={handleAddCategory} className={styles.addCatForm}>
                            <div className={styles.catTypeToggle}>
                                <button type="button" className={`${styles.typeBtn} ${newCatType === 'expense' ? styles.activeExpense : ''}`} onClick={() => setNewCatType('expense')}>Debit</button>
                                <button type="button" className={`${styles.typeBtn} ${newCatType === 'income' ? styles.activeIncome : ''}`} onClick={() => setNewCatType('income')}>Credit</button>
                            </div>
                            <div className={styles.addInputGroup}>
                                <Input placeholder="New Category Name" value={newCatName} onChange={e => setNewCatName(e.target.value)} className={styles.catInput} />
                                <Button type="submit" variant="primary" isLoading={isAddingCat} disabled={!newCatName.trim()}><Plus size={18} /></Button>
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

                    {/* Developer Tools */}
                    <div className={styles.card}>
                        <h3>Developer Tools</h3>
                        <div className={styles.actions}>
                            <Button variant="secondary" onClick={handleSeedData} isLoading={isSeeding}>
                                {isSeeding ? 'Creating...' : 'Generate 100 Demo Entries'}
                            </Button>
                        </div>
                    </div>

                    {/* Traditional Exports */}
                    <div className={styles.card}>
                        <h3>Export Data</h3>
                        <div className={styles.exportGrid}>
                            <Button variant="outline" onClick={handleExport}>
                                <FileJson size={16} style={{ marginRight: 8 }} />
                                JSON
                            </Button>
                            <Button variant="outline" onClick={() => exportToCSV(transactions, categories, people, 'all-transactions.csv')}>
                                <Table size={16} style={{ marginRight: 8 }} />
                                CSV
                            </Button>
                            <Button variant="outline" onClick={() => exportToPDF(transactions, categories, people, 'all-transactions.pdf')}>
                                <FileText size={16} style={{ marginRight: 8 }} />
                                PDF
                            </Button>

                            <div className={styles.importWrapper}>
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload size={16} style={{ marginRight: 8 }} />
                                    Import
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

            </div>
        </div>
    );
};
