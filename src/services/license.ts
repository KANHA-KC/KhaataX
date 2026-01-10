import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, exists, writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';

const LICENSE_FILE = 'khaatax.lic';

export const licenseService = {
    /**
     * Get the unique System ID for this machine
     */
    getSystemId: async (): Promise<string> => {
        try {
            const systemId = await invoke<string>('get_system_id');
            return systemId;
        } catch (error) {
            console.error('Failed to get system ID:', error);
            throw new Error('Unable to retrieve system information');
        }
    },

    /**
     * Verify and activate a license key
     */
    activateLicense: async (licenseKey: string): Promise<boolean> => {
        try {
            const systemId = await licenseService.getSystemId();
            const isValid = await invoke<boolean>('verify_license', {
                systemId,
                licenseKey: licenseKey.trim()
            });

            if (isValid) {
                // Save license to persistent file
                await writeTextFile(LICENSE_FILE, licenseKey.trim(), {
                    baseDir: BaseDirectory.AppData
                });
                return true;
            }
            return false;
        } catch (error) {
            console.error('License activation failed:', error);
            return false;
        }
    },

    /**
     * Check if a valid license exists
     */
    isLicensed: async (): Promise<boolean> => {
        try {
            // Check if license file exists
            const fileExists = await exists(LICENSE_FILE, {
                baseDir: BaseDirectory.AppData
            });

            if (!fileExists) {
                return false;
            }

            // Read and verify the stored license
            const storedKey = await readTextFile(LICENSE_FILE, {
                baseDir: BaseDirectory.AppData
            });

            const systemId = await licenseService.getSystemId();
            const isValid = await invoke<boolean>('verify_license', {
                systemId,
                licenseKey: storedKey.trim()
            });

            return isValid;
        } catch (error) {
            console.error('License check failed:', error);
            return false;
        }
    },

    /**
     * Check if running in Tauri (vs browser)
     */
    isTauriEnvironment: (): boolean => {
        return !!(window as any).__TAURI_INTERNALS__;
    }
};
