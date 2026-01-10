import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useLedger } from '../context/LedgerContext';
import { DEFAULT_ACCOUNTS } from '../types';
import type { Transaction, Person } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Combobox } from './ui/Combobox';
import styles from './AddTransactionModal.module.css';
import { TransliteratedInput } from './ui/TransliteratedInput';
import { useTranslation } from '../context/LanguageContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const AddTransactionModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const {
        addTransaction,
        addPerson,
        people,
        categories,
        accounts
    } = useLedger();

    // Form State
    const [amount, setAmount] = useState('');
    const [isExpense, setIsExpense] = useState(true); // Toggle for Income/Expense
    const [accountId, setAccountId] = useState(DEFAULT_ACCOUNTS[0].id); // Default Cash
    const [categoryId, setCategoryId] = useState('');
    const [personId, setPersonId] = useState<string | null>(null); // Required
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Focus Ref
    const amountRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setAmount('');
            setIsExpense(true); // Default to expense
            setNotes('');
            // Keep account/date as they might be repetitive

            // Focus amount after small delay to allow render
            setTimeout(() => amountRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!amount || !categoryId || !personId) return;

        setIsSubmitting(true);
        try {
            const numAmount = parseFloat(amount);
            const type = isExpense ? 'expense' : 'income';

            const newTx: Transaction = {
                id: uuidv4(),
                amount: numAmount,
                type,
                accountId,
                categoryId, // TODO: Handle "Category is required" validation visually
                payeeId: personId,
                notes: notes || undefined,
                date,
                createdAt: Date.now()
            };

            await addTransaction(newTx);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePersonCreate = async (name: string) => {
        const newPerson: Person = {
            id: uuidv4(),
            name,
            createdAt: Date.now()
        };
        await addPerson(newPerson);
        setPersonId(newPerson.id); // Auto-select created person
    };

    const accountOptions = accounts.map(a => ({ label: a.name, value: a.id }));
    const categoryOptions = categories
        .filter(c => c.type === (isExpense ? 'expense' : 'income'))
        .map(c => ({ label: c.name, id: c.id }));

    const peopleOptions = people.map(p => ({ label: p.name, id: p.id }));

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{t('add_transaction')}</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>Esc</Button>
                </div>

                <form className={styles.form} onSubmit={handleSubmit}>
                    {/* Top Row: Type Toggle & Amount */}
                    <div className={styles.row}>
                        <div className={styles.toggleGroup}>
                            <button
                                type="button"
                                className={`${styles.toggle} ${isExpense ? styles.expenseActive : ''}`}
                                onClick={() => setIsExpense(true)}
                            >
                                Debit
                            </button>
                            <button
                                type="button"
                                className={`${styles.toggle} ${!isExpense ? styles.incomeActive : ''}`}
                                onClick={() => setIsExpense(false)}
                            >
                                Credit
                            </button>
                        </div>
                        <div className={styles.amountWrapper}>
                            <Input
                                ref={amountRef}
                                type="number"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className={styles.amountInput}
                                required
                                step="0.01"
                            />
                        </div>
                    </div>

                    <Select
                        label="Account"
                        options={accountOptions}
                        value={accountId}
                        onChange={e => setAccountId(e.target.value)}
                        fullWidth
                    />

                    <Combobox
                        label="Category"
                        options={categoryOptions}
                        onChange={opt => setCategoryId(opt?.id || '')}
                        placeholder="Select Category"
                        fullWidth
                    />

                    <Combobox
                        label="Person / Payee"
                        options={peopleOptions}
                        onChange={opt => setPersonId(opt?.id || null)}
                        onCreate={handlePersonCreate}
                        placeholder="Who is this with?"
                        fullWidth
                    />


                    <div className={styles.row}>
                        <Input
                            type="date"
                            label="Date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <TransliteratedInput
                        placeholder={t('notes')}
                        value={notes}
                        onValueChange={setNotes}
                        fullWidth
                    />

                    <div className={styles.footer}>
                        <Button variant="primary" type="submit" size="lg" fullWidth isLoading={isSubmitting}>
                            {t('save')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
