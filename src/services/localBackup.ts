import { writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { documentDir, join } from '@tauri-apps/api/path';
import { backupService } from './backup';

export const localBackupService = {
    /**
     * Performs a backup to the local file system (Documents folder).
     * Works only when running inside Tauri.
     */
    performLocalBackup: async (): Promise<string | null> => {
        try {
            // 1. Check if we are running in Tauri
            if (!(window as any).__TAURI_INTERNALS__) {
                console.warn('Local backup skipped: Not running in Tauri environment.');
                return null;
            }

            // 2. Prepare data
            const data = await backupService.createBackupData();
            const jsonString = JSON.stringify(data, null, 2);

            // 3. Get Documents directory
            const docPath = await documentDir();
            const backupFolderPath = await join(docPath, 'KhaataX', 'Backups');

            // 4. Ensure directory exists
            const folderExists = await exists(backupFolderPath);
            if (!folderExists) {
                await mkdir(backupFolderPath, { recursive: true });
            }

            // 5. Generate filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `khaatax-local-backup-${timestamp}.json`;
            const filePath = await join(backupFolderPath, filename);

            // 6. Write file
            await writeTextFile(filePath, jsonString);

            console.log(`Local backup saved to: ${filePath}`);
            localStorage.setItem('last_local_backup_time', new Date().toLocaleString());
            localStorage.setItem('last_local_backup_path', filePath);

            return filePath;
        } catch (error) {
            console.error('Local backup failed:', error);
            return null;
        }
    },

    /**
     * Checks if a local backup is needed (e.g., once a day).
     */
    checkAndTriggerLocalBackup: async (): Promise<void> => {
        const lastBackup = localStorage.getItem('last_local_backup_time');
        if (!lastBackup) {
            await localBackupService.performLocalBackup();
            return;
        }

        const lastDate = new Date(lastBackup);
        const now = new Date();
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 3600);

        if (diffHours >= 24) {
            await localBackupService.performLocalBackup();
        }
    }
};
