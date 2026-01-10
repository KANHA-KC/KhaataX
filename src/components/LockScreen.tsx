import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Lock } from 'lucide-react';

export const LockScreen = ({ onUnlock }: { onUnlock: () => void }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState(false);
    const savedPin = localStorage.getItem('ledger_app_pin');

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === savedPin) {
            onUnlock();
        } else {
            setError(true);
            setPin('');
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
            zIndex: 9999
        }}>
            <div className="card" style={{ maxWidth: '320px', width: '100%', padding: '2rem' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    backgroundColor: 'hsl(var(--color-primary-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    color: 'hsl(var(--color-primary))'
                }}>
                    <Lock size={32} />
                </div>

                <h2 style={{ marginBottom: '0.5rem' }}>App Locked</h2>
                <p style={{ marginBottom: '1.5rem', color: 'hsl(var(--color-text-secondary))', fontSize: '0.9rem' }}>
                    Please enter your PIN to continue.
                </p>

                <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <Input
                        type="password"
                        placeholder="Enter PIN"
                        value={pin}
                        onChange={e => {
                            setPin(e.target.value);
                            setError(false);
                        }}
                        autoFocus
                        style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5rem' }}
                    />

                    {error && (
                        <p style={{ color: 'hsl(var(--color-danger))', fontSize: '0.8rem', marginTop: '-0.5rem' }}>
                            Incorrect PIN. Please try again.
                        </p>
                    )}

                    <Button type="submit" variant="primary" fullWidth size="lg">
                        Unlock
                    </Button>
                </form>
            </div>
        </div>
    );
};
