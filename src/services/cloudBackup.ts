export type BackupFrequency = 'daily' | 'weekly' | 'manual';

interface CloudConfig {
    isConnected: boolean;
    accountName: string | null;
    frequency: BackupFrequency;
    lastBackup: string | null;
}

const STORAGE_KEY = 'ledger_cloud_config';

export const cloudBackup = {
    getConfig: (): CloudConfig => {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {
            isConnected: false,
            accountName: null,
            frequency: 'manual',
            lastBackup: null
        };
    },

    saveConfig: (config: CloudConfig) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    },

    login: async (): Promise<boolean> => {
        return new Promise((resolve) => {
            setTimeout(() => {
                const email = prompt("Enter your Google Email to connect:", "user@gmail.com");
                if (email) {
                    const current = cloudBackup.getConfig();
                    cloudBackup.saveConfig({ ...current, isConnected: true, accountName: email });
                    resolve(true);
                } else {
                    resolve(false);
                }
            }, 1000);
        });
    },

    logout: async () => {
        const current = cloudBackup.getConfig();
        cloudBackup.saveConfig({ ...current, isConnected: false, accountName: null });
    },

    performBackup: async (): Promise<void> => {
        // Simulate upload delay
        return new Promise((resolve) => {
            setTimeout(() => {
                const current = cloudBackup.getConfig();
                cloudBackup.saveConfig({ ...current, lastBackup: new Date().toISOString() });
                resolve();
            }, 1500);
        });
    }
};
