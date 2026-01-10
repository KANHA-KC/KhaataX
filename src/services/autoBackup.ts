import { googleDriveService } from './googleDrive';
import { backupService } from './backup';

export type AutoBackupFrequency = 'daily' | 'weekly' | 'monthly' | 'off';

const STORAGE_KEYS = {
    FREQUENCY: 'backup_frequency',
    LAST_AUTO_BACKUP: 'last_auto_backup_timestamp'
};

export const autoBackupService = {
    getFrequency: (): AutoBackupFrequency => {
        return (localStorage.getItem(STORAGE_KEYS.FREQUENCY) as AutoBackupFrequency) || 'off';
    },

    setFrequency: (freq: AutoBackupFrequency) => {
        localStorage.setItem(STORAGE_KEYS.FREQUENCY, freq);
    },

    getLastBackupTime: (): number | null => {
        const ts = localStorage.getItem(STORAGE_KEYS.LAST_AUTO_BACKUP);
        return ts ? parseInt(ts, 10) : null;
    },

    checkAndTriggerBackup: async (): Promise<boolean> => {
        const freq = autoBackupService.getFrequency();
        if (freq === 'off') return false;

        if (!googleDriveService.isAuthenticated()) {
            // Can't auto backup if not logged in.
            // In a real app we might try to silent login if token exists.
            return false;
        }

        const lastBackup = autoBackupService.getLastBackupTime();
        if (!lastBackup) {
            // Never backed up, do it now
            return await autoBackupService.performBackup();
        }

        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        let diffNeeded = 0;

        switch (freq) {
            case 'daily': diffNeeded = oneDay; break;
            case 'weekly': diffNeeded = 7 * oneDay; break;
            case 'monthly': diffNeeded = 30 * oneDay; break;
        }

        if (now - lastBackup > diffNeeded) {
            return await autoBackupService.performBackup();
        }

        return false;
    },

    performBackup: async (): Promise<boolean> => {
        try {
            console.log('Starting auto-backup...');
            const data = await backupService.createBackupData();
            const blob = backupService.createBackupBlob(data);
            const filename = `khaatax-auto-backup-${new Date().toISOString().split('T')[0]}.json`;

            await googleDriveService.uploadFile(blob, filename);

            localStorage.setItem(STORAGE_KEYS.LAST_AUTO_BACKUP, Date.now().toString());
            // Also update the main display timestamp if we want
            localStorage.setItem('last_sync_time', new Date().toLocaleString());

            console.log('Auto-backup complete.');
            return true;
        } catch (error) {
            console.error('Auto-backup failed:', error);
            return false;
        }
    }
};
