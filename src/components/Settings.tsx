import React, { useRef, useState, useEffect } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Button } from './ui/Button';
import { seedData } from '../utils/seeder';
import styles from './Settings.module.css';
import { Input } from './ui/Input';
import { v4 as uuidv4 } from 'uuid';
import { Plus, FileJson, FileText, Table, Upload, X, Languages } from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/export';

import { backupService } from '../services/backup';
import { dbService } from '../services/db';
import { useTranslation } from '../context/LanguageContext';
import { localBackupService as simpleBackupService } from '../services/simpleBackup';

export const Settings = () => {
    const { t, language, setLanguage } = useTranslation();
    const { refreshData, categories, addCategory, deleteCategory, transactions, people } = useLedger();
    const [isSeeding, setIsSeeding] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Category Management State
    const [newCatName, setNewCatName] = useState('');
    const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');
    const [isAddingCat, setIsAddingCat] = useState(false);

    const [isTauri, setIsTauri] = useState(false);

    // Simple Backup State
    const [backupPath, setBackupPath] = useState<string>('');

    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [recentBackups, setRecentBackups] = useState<Array<{ name: string; path: string; date: Date }>>([]);
    const [isRestoring, setIsRestoring] = useState(false);

    const loadBackupInfo = async () => {
        if (!!(window as any).__TAURI_INTERNALS__) {
            const path = simpleBackupService.getStoredPath();
            if (path) {
                setBackupPath(path);
                loadRecentBackups();
            }
        }
    };

    const loadRecentBackups = async () => {
        try {
            const backups = await simpleBackupService.listBackups();
            setRecentBackups(backups);
            if (backups.length > 0) {
                // setLastSimpleBackup(backups[0].date.toLocaleString());
            }
        } catch (e) {
            console.error('Failed to load recent backups', e);
        }
    };

    useEffect(() => {
        setIsTauri(!!(window as any).__TAURI_INTERNALS__);
        loadBackupInfo();
    }, []);

    // Calculate backup size on component mount


    // Cleaned up unused Google Drive functions
    const handleSelectFolder = async () => {
        try {
            const path = await simpleBackupService.selectBackupFolder();
            if (path) {
                setBackupPath(path);
                await loadRecentBackups();
            }
        } catch (error) {
            console.error(error);
        }
    };

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
            await loadRecentBackups();
            alert(`✅ Backup created successfully!\n\nFile: ${filename}`);
        } catch (error: any) {
            console.error('Backup error:', error);
            // If error suggests no folder, try selecting
            if (error.message.includes('No backup folder selected')) {
                await handleSelectFolder();
            } else {
                alert(`❌ Backup failed: ${error.message || 'Unknown error'}`);
            }
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleRestoreSimpleBackup = async (fullPath: string) => {
        if (!confirm('⚠️ Restore this backup?\n\nThis will OVERWRITE all current data. This action cannot be undone.')) return;

        setIsRestoring(true);
        try {
            const data = await simpleBackupService.restoreBackup(fullPath);
            await backupService.restoreBackup(data); // Using existing restore logic to process the data
            await refreshData();
            alert('✅ Restore successful! The app will now reload.');
            window.location.reload();
        } catch (error: any) {
            console.error('Restore failed:', error);
            alert(`❌ Restore failed: ${error.message}`);
        } finally {
            setIsRestoring(false);
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



                        <div className={styles.waContainer}>
                            {/* Simple Local Backup - Desktop Only */}
                            {isTauri && (
                                <div className={styles.waContainer}>
                                    <h3 style={{ marginBottom: '0.5rem' }}>📁 Local Backups</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                                        Save your data to a local folder for safekeeping.
                                    </p>

                                    <div className={styles.waSection}>
                                        <div className={styles.waLabel}>Backup Location:</div>
                                        <div style={{
                                            padding: '0.5rem',
                                            background: 'var(--bg-elevated)',
                                            borderRadius: '4px',
                                            fontSize: '0.85rem',
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                            marginTop: '0.5rem',
                                            marginBottom: '0.5rem'
                                        }}>
                                            {backupPath || 'No folder selected'}
                                        </div>
                                        <Button
                                            onClick={handleSelectFolder}
                                            variant="secondary"
                                            size="sm"
                                            style={{ width: '100%' }}
                                        >
                                            {backupPath ? '📂 Change Folder' : '📂 Select Folder'}
                                        </Button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                                        <Button
                                            onClick={handleCreateSimpleBackup}
                                            disabled={isCreatingBackup}
                                            style={{ flex: 1 }}
                                        >
                                            {isCreatingBackup ? 'Creating...' : '💾 Create Backup Now'}
                                        </Button>

                                        <Button
                                            onClick={handleOpenBackupFolder}
                                            variant="secondary"
                                            style={{ flex: 1 }}
                                        >
                                            📂 Open Folder
                                        </Button>
                                    </div>

                                    {/* Recent Backups List */}
                                    {recentBackups.length > 0 && (
                                        <div style={{ marginTop: '2rem' }}>
                                            <div className={styles.waLabel} style={{ marginBottom: '0.75rem' }}>Recent Backups:</div>
                                            <div style={{
                                                background: 'var(--bg-elevated)',
                                                borderRadius: '8px',
                                                overflow: 'hidden',
                                                border: '1px solid var(--border-color)'
                                            }}>
                                                {recentBackups.map((backup, index) => (
                                                    <div key={backup.name} style={{
                                                        padding: '1rem',
                                                        borderBottom: index < recentBackups.length - 1 ? '1px solid var(--border-color)' : 'none',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center'
                                                    }}>
                                                        <div style={{ overflow: 'hidden' }}>
                                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                                                {backup.date.toLocaleString()}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '0.75rem',
                                                                color: 'var(--text-secondary)',
                                                                whiteSpace: 'nowrap',
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                maxWidth: '200px'
                                                            }}>
                                                                {backup.name}
                                                            </div>
                                                        </div>
                                                        <Button
                                                            variant="danger"
                                                            size="sm"
                                                            onClick={() => handleRestoreSimpleBackup(backup.path)}
                                                            disabled={isRestoring}
                                                            style={{ marginLeft: '1rem', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                                                        >
                                                            Restore ↺
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tip about Google Drive Desktop - Moved to bottom */}
                                    <div style={{
                                        marginTop: '2rem',
                                        padding: '1rem',
                                        background: 'hsl(var(--color-primary-light))',
                                        borderRadius: '8px',
                                        border: '1px solid hsl(var(--color-primary))',
                                        fontSize: '0.9rem'
                                    }}>
                                        <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>
                                            💡 Tip: Automatic Cloud Backup
                                        </div>
                                        <div style={{ color: 'var(--text-secondary)' }}>
                                            Install <strong>Google Drive for Desktop</strong> and sync your backup folder for automatic cloud backup!
                                            <br />
                                            <a
                                                href="https://www.google.com/drive/download/"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: 'hsl(var(--color-primary))', marginTop: '0.5rem', display: 'inline-block' }}
                                            >
                                                Download Google Drive →
                                            </a>
                                        </div>
                                    </div>
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
