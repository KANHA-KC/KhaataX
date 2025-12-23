import React, { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useLedger } from '../context/LedgerContext';
import { DEFAULT_ACCOUNTS } from '../types';
import type { Transaction } from '../types';
import { formatCurrency } from '../utils/format';
import { Button } from './ui/Button';
import { X, Check } from 'lucide-react';
import { format } from 'date-fns';
import styles from './PersonDetailModal.module.css';

interface Props {
    personId: string;
    onClose: () => void;
}

export const PersonDetailModal: React.FC<Props> = ({ personId, onClose }) => {
    const { people, transactions, addTransaction } = useLedger();

    const person = people.find(p => p.id === personId);

    const history = useMemo(() => {
        return transactions.filter(tx => tx.payeeId === personId);
    }, [transactions, personId]);

    const { iPaid, theyPaid, netBalance } = useMemo(() => {
        const iPaid = history
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const theyPaid = history
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        return { iPaid, theyPaid, netBalance: iPaid - theyPaid };
    }, [history]);

    const [isSettling, setIsSettling] = React.useState(false);
    const [settleAmount, setSettleAmount] = React.useState('');

    // Reset state when person changes or modal opens
    React.useEffect(() => {
        if (personId) {
            setIsSettling(false);
            setSettleAmount('');
        }
    }, [personId]);

    const startSettle = () => {
        setSettleAmount(Math.abs(netBalance).toString());
        setIsSettling(true);
    };

    const confirmSettle = async () => {
        const amount = parseFloat(settleAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Invalid amount");
            return;
        }

        const isTheyOwe = netBalance > 0;

        const settlementTx: Transaction = {
            id: uuidv4(),
            amount: amount,
            type: isTheyOwe ? 'income' : 'expense',
            accountId: DEFAULT_ACCOUNTS[0].id,
            categoryId: isTheyOwe ? 'cat_settlement_in' : 'cat_settlement',
            payeeId: personId,
            notes: 'Settlement Payment',
            date: format(new Date(), 'yyyy-MM-dd'),
            createdAt: Date.now()
        };

        await addTransaction(settlementTx);
        setIsSettling(false);
    };

    if (!person) return null;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h2>{person.name}</h2>
                        <span className={styles.subtitle}>Friend / Payee</span>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
                </div>

                <div className={styles.summaryBox}>
                    <div className={styles.netBalance}>
                        <label>{netBalance === 0 ? 'Settled' : (netBalance > 0 ? 'Owes You' : 'You Owe')}</label>
                        <div className={`${styles.bigNumber} ${netBalance > 0 ? styles.green : ''} ${netBalance < 0 ? styles.red : ''}`}>
                            {formatCurrency(Math.abs(netBalance))}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'hsl(var(--color-text-secondary))', marginTop: '0.5rem', fontWeight: 500 }}>
                            Debit: <span style={{ color: 'hsl(var(--color-text))' }}>{formatCurrency(iPaid)}</span> &nbsp;•&nbsp;
                            Credit: <span style={{ color: 'hsl(var(--color-text))' }}>{formatCurrency(theyPaid)}</span>
                        </div>
                    </div>

                    {netBalance !== 0 && (
                        <div className={styles.actionArea}>
                            {!isSettling ? (
                                <Button variant="primary" size="sm" onClick={startSettle}>
                                    <Check size={16} style={{ marginRight: 6 }} />
                                    Settle Up
                                </Button>
                            ) : (
                                <div className={styles.settleForm}>
                                    <input
                                        type="number"
                                        className={styles.settleInput}
                                        value={settleAmount}
                                        onChange={e => setSettleAmount(e.target.value)}
                                        placeholder="Amount"
                                        autoFocus
                                    />
                                    <div className={styles.settleActions}>
                                        <Button variant="primary" size="sm" onClick={confirmSettle}>Confirm</Button>
                                        <Button variant="outline" size="sm" onClick={() => setIsSettling(false)}>Cancel</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.historyList}>
                    <h3>History</h3>
                    {history.length === 0 ? (
                        <p className={styles.empty}>No transactions.</p>
                    ) : (
                        <table className={styles.historyTable}>
                            <tbody>
                                {history.map(tx => (
                                    <tr key={tx.id}>
                                        <td className={styles.date}>{format(new Date(tx.date), 'MMM d, yyyy')}</td>
                                        <td className={styles.note}>{tx.notes || (tx.type === 'expense' ? 'Debit' : 'Credit')}</td>
                                        <td className={`${styles.amount} ${tx.type === 'income' ? styles.green : ''}`}>
                                            {tx.type === 'expense' ? '-' : '+'}{formatCurrency(tx.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};
