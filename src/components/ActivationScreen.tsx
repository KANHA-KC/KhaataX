import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Key, Copy, CheckCircle } from 'lucide-react';
import { licenseService } from '../services/license';

export const ActivationScreen = ({ onActivated }: { onActivated: () => void }) => {
    const [systemId, setSystemId] = useState<string>('Loading...');
    const [licenseKey, setLicenseKey] = useState('');
    const [error, setError] = useState('');
    const [isActivating, setIsActivating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchSystemId = async () => {
            try {
                const id = await licenseService.getSystemId();
                setSystemId(id);
            } catch (err) {
                setSystemId('Error loading System ID');
                setError('Failed to retrieve system information');
            }
        };
        fetchSystemId();
    }, []);

    const handleCopySystemId = () => {
        navigator.clipboard.writeText(systemId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsActivating(true);

        try {
            const success = await licenseService.activateLicense(licenseKey);
            if (success) {
                onActivated();
            } else {
                setError('Invalid license key. Please check and try again.');
            }
        } catch (err) {
            setError('Activation failed. Please try again.');
        } finally {
            setIsActivating(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'hsl(var(--bg-app))',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999,
            padding: '2rem'
        }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2.5rem' }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'hsl(var(--color-primary-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    color: 'hsl(var(--color-primary))'
                }}>
                    <Key size={40} />
                </div>

                <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Activate KhaataX</h2>
                <p style={{
                    marginBottom: '2rem',
                    color: 'hsl(var(--color-text-secondary))',
                    fontSize: '0.95rem',
                    textAlign: 'center'
                }}>
                    This software requires activation. Please contact your administrator with your System ID.
                </p>

                {/* System ID Display */}
                <div style={{
                    background: 'hsl(var(--bg-elevated))',
                    padding: '1rem',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: '1.5rem',
                    border: '1px solid hsl(var(--border-color))'
                }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        marginBottom: '0.5rem',
                        color: 'hsl(var(--color-text-secondary))'
                    }}>
                        Your System ID
                    </label>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <code style={{
                            flex: 1,
                            padding: '0.75rem',
                            background: 'hsl(var(--bg-app))',
                            borderRadius: 'var(--radius-sm)',
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            wordBreak: 'break-all',
                            border: '1px solid hsl(var(--border-color))'
                        }}>
                            {systemId}
                        </code>
                        <button
                            onClick={handleCopySystemId}
                            style={{
                                padding: '0.75rem',
                                background: copied ? 'hsl(var(--color-success))' : 'hsl(var(--color-primary))',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            title="Copy System ID"
                        >
                            {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                        </button>
                    </div>
                </div>

                {/* License Key Input */}
                <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input
                        label="License Key"
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                        value={licenseKey}
                        onChange={e => {
                            setLicenseKey(e.target.value);
                            setError('');
                        }}
                        style={{
                            textAlign: 'center',
                            fontSize: '1.1rem',
                            letterSpacing: '0.1rem',
                            textTransform: 'uppercase'
                        }}
                        autoFocus
                    />

                    {error && (
                        <p style={{
                            color: 'hsl(var(--color-danger))',
                            fontSize: '0.85rem',
                            marginTop: '-0.5rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </p>
                    )}

                    <Button
                        type="submit"
                        variant="primary"
                        fullWidth
                        size="lg"
                        isLoading={isActivating}
                        disabled={!licenseKey.trim() || isActivating}
                    >
                        {isActivating ? 'Activating...' : 'Activate'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
