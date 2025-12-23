import React, { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

// We'll use a simple localStorage flag for the "Profile" for now, 
// as the requirements only mention "Local profile". 
// In a real app we might store this in IDB 'settings' store.

export const Onboarding = ({ onComplete }: { onComplete: () => void }) => {
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('INR');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        // Save to localStorage
        localStorage.setItem('ledger_user_name', name);
        localStorage.setItem('ledger_currency', currency);
        onComplete();
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            textAlign: 'center'
        }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                <h2 style={{ marginBottom: '1rem', color: 'hsl(var(--color-primary))' }}>Welcome to Ledger</h2>
                <p style={{ marginBottom: '2rem', color: 'hsl(var(--color-text-secondary))' }}>
                    Your fast, offline-first finance companion. <br /> Let's get you set up.
                </p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', textAlign: 'left' }}>
                    <Input
                        label="What should we call you?"
                        placeholder="e.g. KC"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        fullWidth
                        required
                        autoFocus
                    />

                    <Select
                        label="Preferred Currency"
                        options={[
                            { label: 'Indan Rupee (₹)', value: 'INR' },
                            { label: 'US Dollar ($)', value: 'USD' },
                            { label: 'Euro (€)', value: 'EUR' },
                            { label: 'British Pound (£)', value: 'GBP' },
                        ]}
                        value={currency}
                        onChange={e => setCurrency(e.target.value)}
                        fullWidth
                    />

                    <Button type="submit" variant="primary" fullWidth size="lg">
                        Get Started
                    </Button>
                </form>
            </div>
        </div>
    );
};
