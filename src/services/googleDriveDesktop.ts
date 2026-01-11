import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '../config';
import { open } from '@tauri-apps/plugin-shell';

const DEVICE_CODE_ENDPOINT = 'https://oauth2.googleapis.com/device/code';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata';

interface DeviceCodeResponse {
    device_code: string;
    user_code: string;
    verification_url: string;
    expires_in: number;
    interval: number;
}

interface TokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
}

export class GoogleDriveDesktopService {
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private tokenExpiry: number | null = null;

    constructor() {
        this.restoreSession();
    }

    /**
     * Step 1: Request device code from Google
     */
    async requestDeviceCode(): Promise<DeviceCodeResponse> {
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES
        });

        const response = await fetch(DEVICE_CODE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Device code request failed: ${error}`);
        }

        return await response.json();
    }

    /**
     * Step 2: Open browser for user to authorize
     */
    async openAuthorizationUrl(verificationUrl: string): Promise<void> {
        try {
            await open(verificationUrl);
        } catch (err) {
            console.error('Failed to open browser:', err);
            // Fallback: user can manually open the URL
        }
    }

    /**
     * Step 3: Poll for authorization completion
     */
    async pollForAuthorization(deviceCode: string, interval: number): Promise<TokenResponse> {
        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            device_code: deviceCode,
            grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        });

        // Poll every `interval` seconds (Google recommends 5 seconds)
        const pollInterval = (interval || 5) * 1000;
        const maxAttempts = 60; // 5 minutes max
        let attempts = 0;

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;

            const response = await fetch(TOKEN_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params.toString()
            });

            const data = await response.json();

            if (response.ok) {
                // Success! User authorized
                return data;
            }

            // Check error type
            if (data.error === 'authorization_pending') {
                // User hasn't authorized yet, keep polling
                continue;
            } else if (data.error === 'slow_down') {
                // We're polling too fast, increase interval
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                continue;
            } else if (data.error === 'expired_token') {
                throw new Error('Authorization code expired. Please try again.');
            } else if (data.error === 'access_denied') {
                throw new Error('User denied access.');
            } else {
                throw new Error(`Authorization failed: ${data.error_description || data.error}`);
            }
        }

        throw new Error('Authorization timeout. Please try again.');
    }

    /**
     * Complete authorization flow
     */
    async authorize(): Promise<{ userCode: string; verificationUrl: string }> {
        // Step 1: Get device code
        const deviceCodeData = await this.requestDeviceCode();

        // Step 2: Open browser
        await this.openAuthorizationUrl(deviceCodeData.verification_url);

        // Step 3: Start polling in background
        this.pollForAuthorization(deviceCodeData.device_code, deviceCodeData.interval)
            .then(tokens => {
                this.saveTokens(tokens);
            })
            .catch(err => {
                console.error('Authorization failed:', err);
            });

        // Return user code for display
        return {
            userCode: deviceCodeData.user_code,
            verificationUrl: deviceCodeData.verification_url
        };
    }

    /**
     * Save tokens to memory and localStorage
     */
    private saveTokens(tokens: TokenResponse): void {
        this.accessToken = tokens.access_token;
        if (tokens.refresh_token) {
            this.refreshToken = tokens.refresh_token;
        }
        this.tokenExpiry = Date.now() + (tokens.expires_in * 1000);

        // Persist to localStorage
        localStorage.setItem('g_desktop_access_token', this.accessToken);
        if (this.refreshToken) {
            localStorage.setItem('g_desktop_refresh_token', this.refreshToken);
        }
        localStorage.setItem('g_desktop_token_expiry', this.tokenExpiry.toString());
    }

    /**
     * Restore session from localStorage
     */
    private restoreSession(): boolean {
        const token = localStorage.getItem('g_desktop_access_token');
        const refresh = localStorage.getItem('g_desktop_refresh_token');
        const expiry = localStorage.getItem('g_desktop_token_expiry');

        if (token && expiry) {
            const expiryTime = parseInt(expiry);
            if (Date.now() < expiryTime) {
                this.accessToken = token;
                this.refreshToken = refresh;
                this.tokenExpiry = expiryTime;
                return true;
            } else if (refresh) {
                // Token expired but we have refresh token
                this.refreshToken = refresh;
                this.refreshAccessToken().catch(err => {
                    console.error('Token refresh failed:', err);
                    this.signOut();
                });
            }
        }
        return false;
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(): Promise<void> {
        if (!this.refreshToken) {
            throw new Error('No refresh token available');
        }

        const params = new URLSearchParams({
            client_id: GOOGLE_CLIENT_ID,
            client_secret: GOOGLE_CLIENT_SECRET,
            refresh_token: this.refreshToken,
            grant_type: 'refresh_token'
        });

        const response = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        if (!response.ok) {
            throw new Error('Token refresh failed');
        }

        const tokens = await response.json();
        this.saveTokens(tokens);
    }

    /**
     * Get valid access token (refresh if needed)
     */
    async getAccessToken(): Promise<string> {
        if (!this.accessToken) {
            throw new Error('Not authenticated');
        }

        // Check if token is expired or about to expire (5 min buffer)
        if (this.tokenExpiry && Date.now() >= this.tokenExpiry - 300000) {
            await this.refreshAccessToken();
        }

        return this.accessToken;
    }

    /**
     * Sign out
     */
    signOut(): void {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('g_desktop_access_token');
        localStorage.removeItem('g_desktop_refresh_token');
        localStorage.removeItem('g_desktop_token_expiry');
    }

    /**
     * Check if authenticated
     */
    isAuthenticated(): boolean {
        return !!this.accessToken && !!this.tokenExpiry && Date.now() < this.tokenExpiry;
    }
}

export const googleDriveDesktopService = new GoogleDriveDesktopService();
