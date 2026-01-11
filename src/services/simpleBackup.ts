import { BaseDirectory, exists, create, writeTextFile, readTextFile, readDir } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';
import { documentDir } from '@tauri-apps/api/path';

const BACKUP_DIR = 'KhaataX/Backups';
const isTauri = !!(window as any).__TAURI_INTERNALS__;

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
     * Ensure backup directory exists
     */
    private async ensureBackupDir(): Promise<string> {
        if (!isTauri) {
            throw new Error('Local backup only works in desktop app');
        }

        try {
            const docDir = await documentDir();
            const backupPath = `${docDir}/${BACKUP_DIR}`;

            // Check if directory exists
            const dirExists = await exists(BACKUP_DIR, { baseDir: BaseDirectory.Document });

            if (!dirExists) {
                // Create directory recursively
                await create(`${BACKUP_DIR}`, { baseDir: BaseDirectory.Document });
                console.log('Created backup directory:', backupPath);
            }

            return backupPath;
        } catch (error) {
            console.error('Failed to create backup directory:', error);
            throw error;
        }
    }

    /**
     * Create a backup file
     */
    async createBackup(data: Omit<BackupData, 'version' | 'timestamp'>): Promise<string> {
        await this.ensureBackupDir();

        const backup: BackupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            ...data
        };

        const filename = `backup_${new Date().toISOString().split('T')[0]}_${Date.now()}.json`;
        const content = JSON.stringify(backup, null, 2);

        try {
            await writeTextFile(`${BACKUP_DIR}/${filename}`, content, {
                baseDir: BaseDirectory.Document
            });

            console.log('Backup created:', filename);
            return filename;
        } catch (error) {
            console.error('Failed to create backup:', error);
            throw new Error(`Backup failed: ${error}`);
        }
    }

    /**
     * List all backup files
     */
    async listBackups(): Promise<Array<{ name: string; path: string; date: Date }>> {
        if (!isTauri) return [];

        try {
            await this.ensureBackupDir();

            const entries = await readDir(BACKUP_DIR, { baseDir: BaseDirectory.Document });

            return entries
                .filter(entry => entry.name?.endsWith('.json'))
                .map(entry => ({
                    name: entry.name!,
                    path: `${BACKUP_DIR}/${entry.name}`,
                    date: new Date(entry.name!.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '')
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        } catch (error) {
            console.error('Failed to list backups:', error);
            return [];
        }
    }

    /**
     * Restore from a backup file
     */
    async restoreBackup(filename: string): Promise<BackupData> {
        try {
            const content = await readTextFile(`${BACKUP_DIR}/${filename}`, {
                baseDir: BaseDirectory.Document
            });

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
            alert('This feature only works in the desktop app');
            return;
        }

        try {
            const backupPath = await this.ensureBackupDir();
            await open(backupPath);
        } catch (error) {
            console.error('Failed to open backup folder:', error);
            alert(`Failed to open folder: ${error}`);
        }
    }

    /**
     * Get backup folder path for display
     */
    async getBackupPath(): Promise<string> {
        if (!isTauri) return 'N/A (Desktop only)';

        try {
            return await this.ensureBackupDir();
        } catch {
            return 'Error getting path';
        }
    }
}

export const localBackupService = new LocalBackupService();
