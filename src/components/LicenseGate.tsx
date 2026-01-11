import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import styles from './LicenseGate.module.css';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

export const LicenseGate = ({ children }: { children: React.ReactNode }) => {
    const [isVerifying, setIsVerifying] = useState(true);
    const [isLicensed, setIsLicensed] = useState(false);
    const [systemId, setSystemId] = useState('');
    const [licenseKey, setLicenseKey] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isTauri) {
            // Web version - no license needed
            setIsLicensed(true);
            setIsVerifying(false);
            return;
        }

        const checkLicense = async () => {
            try {
                const storedKey = localStorage.getItem('khaatax_license_key');
                const sysId = await invoke<string>('get_system_id');
                setSystemId(sysId);

                if (storedKey) {
                    const valid = await invoke<boolean>('verify_license', {
                        systemId: sysId,
                        licenseKey: storedKey
                    });

                    if (valid) {
                        setIsLicensed(true);
                        setIsVerifying(false);
                        return;
                    }
                }

                setIsVerifying(false);
            } catch (err: any) {
                console.error('License check failed:', err);
                setError('Failed to verify license. Please try again.');
                setIsVerifying(false);
            }
        };

        checkLicense();
    }, []);

    const handleActivate = async () => {
        if (!licenseKey.trim()) {
            setError('Please enter a license key');
            return;
        }

        setError('');
        setIsVerifying(true);

        try {
            const valid = await invoke<boolean>('verify_license', {
                systemId,
                licenseKey: licenseKey.trim()
            });

            if (valid) {
                localStorage.setItem('khaatax_license_key', licenseKey.trim());
                setIsLicensed(true);
            } else {
                setError('Invalid license key. Please check and try again.');
            }
        } catch (err: any) {
            setError(`Activation failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCopySystemId = () => {
        navigator.clipboard.writeText(systemId);
        alert('System ID copied to clipboard!');
    };

    if (isVerifying) {
        return (
            <div className={styles.container}>
                <div className={styles.loadingBox}>
                    <div className={styles.spinner}></div>
                    <p>Verifying license...</p>
                </div>
            </div>
        );
    }

    if (isLicensed) {
        return <>{children}</>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.licenseBox}>
                <h1>🔐 KhaataX License Activation</h1>
                <p className={styles.subtitle}>Enter your license key to continue</p>

                <div className={styles.systemIdSection}>
                    <label>Your System ID:</label>
                    <div className={styles.systemIdBox}>
                        <code>{systemId}</code>
                        <button onClick={handleCopySystemId} className={styles.copyBtn}>
                            Copy
                        </button>
                    </div>
                    <p className={styles.hint}>
                        Use this System ID to generate your license key
                    </p>
                </div>

                <div className={styles.inputSection}>
                    <label>License Key:</label>
                    <input
                        type="text"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        className={styles.licenseInput}
                        maxLength={19}
                    />
                </div>

                {error && <div className={styles.error}>{error}</div>}

                <button onClick={handleActivate} className={styles.activateBtn}>
                    Activate License
                </button>

                <div className={styles.helpSection}>
                    <p>Don't have a license key?</p>
                    <p className={styles.contactInfo}>
                        Contact: <strong>kanha.kc.designs@gmail.com</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};
