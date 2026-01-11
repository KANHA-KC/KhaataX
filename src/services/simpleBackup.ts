import { writeTextFile, readTextFile, readDir } from '@tauri-apps/plugin-fs';
import { open as openShell } from '@tauri-apps/plugin-shell';
import { open as openDialog } from '@tauri-apps/plugin-dialog';
import { documentDir } from '@tauri-apps/api/path';

const isTauri = !!(window as any).__TAURI_INTERNALS__;
const STORAGE_KEY = 'khaatax_backup_path';

interface BackupData {
    version: string;
    timestamp: string;
    transactions: any[];
    categories: any[];
    people: any[];
    settings: any;
}

export class LocalBackupService {
    /**
     * Get the currently configured backup path
     */
    getStoredPath(): string | null {
        return localStorage.getItem(STORAGE_KEY);
    }

    /**
     * Prompt user to select a backup folder
     */
    async selectBackupFolder(): Promise<string | null> {
        if (!isTauri) return null;

        try {
            const selected = await openDialog({
                directory: true,
                multiple: false,
                title: 'Select Backup Folder',
                defaultPath: await documentDir()
            });

            if (selected && typeof selected === 'string') {
                localStorage.setItem(STORAGE_KEY, selected);
                return selected;
            }
            return null;
        } catch (error) {
            console.error('Failed to select folder:', error);
            throw error;
        }
    }

    /**
     * Create a backup file in the configured path
     */
    async createBackup(data: Omit<BackupData, 'version' | 'timestamp'>): Promise<string> {
        if (!isTauri) throw new Error('Desktop only');

        let backupPath = this.getStoredPath();

        // If no path configured, try to select one
        if (!backupPath) {
            backupPath = await this.selectBackupFolder();
            if (!backupPath) throw new Error('No backup folder selected');
        }

        const backup: BackupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            ...data
        };

        const filename = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
        const fullPath = `${backupPath}/${filename}`.replace(/\\/g, '/'); // Normalize path

        try {
            // Write using absolute path (requires configured fs capabilities)
            await writeTextFile(fullPath, JSON.stringify(backup, null, 2));
            console.log('Backup created:', fullPath);
            return filename;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw new Error(`Backup failed: ${error}. Ensure the folder is writable.`);
        }
    }

    /**
     * List all backup files in the configured path
     * Returns top 3 most recent backups
     */
    async listBackups(): Promise<Array<{ name: string; path: string; date: Date }>> {
        if (!isTauri) return [];

        const backupPath = this.getStoredPath();
        if (!backupPath) return [];

        try {
            const entries = await readDir(backupPath);

            return entries
                .filter(entry => entry.name?.endsWith('.json') && entry.name.includes('backup_'))
                .map(entry => ({
                    name: entry.name!,
                    path: `${backupPath}/${entry.name}`,
                    date: new Date(entry.name!.match(/\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString())
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime())
                .slice(0, 3); // Return only top 3
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Restore from a backup file (full path)
     */
    async restoreBackup(fullPath: string): Promise<BackupData> {
        try {
            const content = await readTextFile(fullPath);
            const backup: BackupData = JSON.parse(content);
            return backup;
        } catch (error) {
            console.error('Failed to restore backup:', error);
            throw new Error(`Restore failed: ${error}`);
        }
    }

    /**
     * Open backup folder in file explorer
     */
    async openBackupFolder(): Promise<void> {
        if (!isTauri) {
            alert('Desktop only');
            return;
        }

        const backupPath = this.getStoredPath();
        if (!backupPath) {
            throw new Error('No backup folder configured');
        }

        try {
            await openShell(backupPath);
        } catch (error) {
            console.error('Failed to open backup folder:', error);
            throw error;
        }
    }
}

export const localBackupService = new LocalBackupService();
