const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';

export interface DriveConfig {
    clientId: string;
    apiKey?: string; // Not always needed for simple Identity implicit flow but good to have struct
}

export class GoogleDriveService {
    private tokenClient: any;
    private accessToken: string | null = null;
    private gapiInited = false;
    private gisInited = false;

    constructor() { }

    /**
     * Load the GAPI and GIS scripts dynamically.
     */
    async loadScripts(): Promise<void> {
        return new Promise((resolve, reject) => {
            if ((window as any).gapi && (window as any).google) {
                resolve();
                return;
            }

            const script1 = document.createElement('script');
            script1.src = 'https://apis.google.com/js/api.js';
            script1.onload = () => {
                (window as any).gapi.load('client', async () => {
                    this.gapiInited = true;
                    if (this.gisInited) resolve();
                });
            };
            script1.onerror = reject;
            document.body.appendChild(script1);

            const script2 = document.createElement('script');
            script2.src = 'https://accounts.google.com/gsi/client';
            script2.onload = () => {
                this.gisInited = true;
                if (this.gapiInited) resolve();
            };
            script2.onerror = reject;
            document.body.appendChild(script2);
        });
    }

    /**
     * Initialize the Google Drive client.
     */
    async initClient(config: DriveConfig): Promise<void> {
        await this.loadScripts();

        await new Promise<void>((resolve, reject) => {
            (window as any).gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS,
            }).then(() => {
                resolve();
            }, (err: any) => {
                reject(err);
            });
        });

        this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: config.clientId,
            scope: SCOPES,
            callback: (resp: any) => {
                if (resp.error !== undefined) {
                    throw resp;
                }
                this.accessToken = resp.access_token;
            },
        });
    }

    async signIn(): Promise<string> {
        if (!this.tokenClient) throw new Error('Client not initialized');

        return new Promise((resolve, reject) => {
            this.tokenClient.callback = (resp: any) => {
                if (resp.error) {
                    reject(resp);
                    return;
                }
                this.saveSession(resp);
                resolve(resp.access_token);
            };

            // Prompt the user to select an account.
            this.tokenClient.requestAccessToken({ prompt: 'consent' });
        });
    }

    private saveSession(resp: any) {
        this.accessToken = resp.access_token;
        const expiresIn = resp.expires_in || 3599;
        const expiryTime = Date.now() + (expiresIn * 1000);

        localStorage.setItem('g_access_token', this.accessToken!);
        localStorage.setItem('g_token_expiry', expiryTime.toString());
    }

    restoreSession(): boolean {
        const token = localStorage.getItem('g_access_token');
        const expiry = localStorage.getItem('g_token_expiry');

        if (token && expiry) {
            if (Date.now() < parseInt(expiry)) {
                this.accessToken = token;
                return true;
            } else {
                this.signOut(); // Clean up expired
            }
        }
        return false;
    }

    /**
     * Sign out (revoke token).
     */
    async signOut(): Promise<void> {
        if (this.accessToken) {
            // Best effort revoke
            try {
                (window as any).google.accounts.oauth2.revoke(this.accessToken);
            } catch (e) { console.warn('Revoke failed', e); }
            this.accessToken = null;
        }
        localStorage.removeItem('g_access_token');
        localStorage.removeItem('g_token_expiry');
        localStorage.removeItem('google_account_email'); // Clear email too if we stored it
    }

    /**
     * Upload a file to Google Drive and manage backup versions (keep only 3 most recent).
     * Uses 'multipart/related' to upload metadata + content in one request.
     */
    async uploadFile(blob: Blob, filename: string, mimeType: string = 'application/json'): Promise<any> {
        if (!this.accessToken) {
            // Try to restore
            if (!this.restoreSession()) {
                throw new Error('Not authenticated');
            }
        }

        const metadata = {
            name: filename,
            mimeType: mimeType,
            description: `KhaataX backup created at ${new Date().toISOString()}`,
            parents: ['appDataFolder']
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime,modifiedTime', {
            method: 'POST',
            headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
            body: form,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const fileData = await response.json();

        // After successful upload, manage versions (keep only 3 most recent)
        await this.manageBackupVersions();

        return fileData;
    }

    /**
     * List backup files from Drive.
     */
    async listBackupFiles(): Promise<any[]> {
        if (!this.accessToken) {
            if (!this.restoreSession()) {
                throw new Error('Not authenticated');
            }
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=name contains 'khaatax-backup-' and mimeType='application/json' and trashed=false&spaces=appDataFolder&fields=files(id,name,createdTime,modifiedTime,webViewLink,size)&orderBy=createdTime desc`,
            {
                headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
            }
        );

        if (!response.ok) {
            throw new Error(`List failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.files || [];
    }

    /**
     * Download a file from Drive.
     */
    async downloadFile(fileId: string): Promise<any> {
        if (!this.accessToken) {
            if (!this.restoreSession()) {
                throw new Error('Not authenticated');
            }
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            {
                headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
            }
        );

        if (!response.ok) {
            throw new Error(`Download failed: ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Delete a file from Drive.
     */
    async deleteFile(fileId: string): Promise<void> {
        if (!this.accessToken) {
            if (!this.restoreSession()) {
                throw new Error('Not authenticated');
            }
        }

        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}`,
            {
                method: 'DELETE',
                headers: new Headers({ 'Authorization': 'Bearer ' + this.accessToken }),
            }
        );

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.statusText}`);
        }
    }

    /**
     * Manage backup versions - keep only the 3 most recent backups.
     */
    async manageBackupVersions(): Promise<void> {
        try {
            const files = await this.listBackupFiles();

            // Keep only 3 most recent (files are already sorted by createdTime desc)
            const toDelete = files.slice(3);

            for (const file of toDelete) {
                await this.deleteFile(file.id);
                console.log(`Deleted old backup: ${file.name}`);
            }
        } catch (error) {
            console.error('Failed to manage backup versions:', error);
            // Don't throw - this is a cleanup operation
        }
    }

    /**
     * Basic check if authenticated.
     */
    isAuthenticated(): boolean {
        return !!this.accessToken || this.restoreSession();
    }
}

export const googleDriveService = new GoogleDriveService();
