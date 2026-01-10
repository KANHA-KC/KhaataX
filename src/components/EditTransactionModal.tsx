import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { useLedger } from '../context/LedgerContext';
import type { Transaction } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Combobox } from './ui/Combobox';
import { v4 as uuidv4 } from 'uuid';
import styles from './AddTransactionModal.module.css';
import { TransliteratedInput } from './ui/TransliteratedInput';
import { useTranslation } from '../context/LanguageContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

export const EditTransactionModal: React.FC<Props> = ({ isOpen, onClose, transaction }) => {
    const { t } = useTranslation();
    const {
        updateTransaction,
        addPerson,
        people,
        categories,
        accounts
    } = useLedger();

    // Form State
    const [amount, setAmount] = useState('');
    const [isExpense, setIsExpense] = useState(true);
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [personId, setPersonId] = useState<string | null>(null); // Required
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [notes, setNotes] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Focus Ref
    const amountRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && transaction) {
            // Populate form with existing transaction data
            setAmount(transaction.amount.toString());
            setIsExpense(transaction.type === 'expense');
            setAccountId(transaction.accountId);
            setCategoryId(transaction.categoryId);
            setPersonId(transaction.payeeId || null);
            setDate(transaction.date);
            setNotes(transaction.notes || '');

            // Focus amount after small delay
            setTimeout(() => amountRef.current?.focus(), 50);
        }
    }, [isOpen, transaction]);

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!amount || !categoryId || !transaction || !personId) return;

        setIsSubmitting(true);
        try {
            const numAmount = parseFloat(amount);
            const type = isExpense ? 'expense' : 'income';

            const updatedTx: Transaction = {
                ...transaction,
                amount: numAmount,
                type,
                accountId,
                categoryId,
                payeeId: personId,
                notes: notes || undefined,
                date,
            };

            await updateTransaction(updatedTx);
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePersonCreate = async (name: string) => {
        const newPerson = {
            id: uuidv4(),
            name,
            createdAt: Date.now()
        };
        await addPerson(newPerson);
        setPersonId(newPerson.id);
    };

    const accountOptions = accounts.map(a => ({ label: a.name, value: a.id }));
    const categoryOptions = categories
        .filter(c => c.type === (isExpense ? 'expense' : 'income'))
        .map(c => ({ label: c.name, id: c.id }));

    const peopleOptions = people.map(p => ({ label: p.name, id: p.id }));

    if (!isOpen || !transaction) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>{t('update')} {t('transactions')}</h2>
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
                            {t('update')}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
