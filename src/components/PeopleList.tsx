import { useMemo, useState } from 'react';
import { useLedger } from '../context/LedgerContext';
import { formatCurrency } from '../utils/format';
import { PersonDetailModal } from './PersonDetailModal'; // Will create next
import styles from './PeopleList.module.css';

export const PeopleList = () => {
    const { people, transactions } = useLedger();
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

    // Calculate balances per person
    // Constraint: "Total paid by you" vs "Total received"
    // If I add an EXPENSE with payee "Bob", it means I paid Bob. (Bob owes me? Or I paid a debt?)
    // Usually in personal trackers:
    // Expense + Payee = I spent money at/for Payee.
    //   If Payee is a "Person", usually means "I paid them".
    // Income + Payee = They paid me.

    // Logic for "Net Balance":
    // You Owe Them (Red): Income from them (They gave me money) > Expenses to them (I gave them money) ??
    // No, let's stick to standard Ledger vs Debt.
    // If I record an Expense "Dinner" with "Bob", I paid.
    //    Does Bob owe me? ONLY if it's a "Split" or "Loan". 
    //    But MVP says "Person-Centric Ledger".
    //    Let's assume:
    //    - Expense tagged with Person = I paid THEM (or for them). (They owe me +)
    //    - Income tagged with Person = They paid ME. (I owe them - / or reduces debt)

    // WAIT. If I buy "Groceries" from "Whole Foods", Whole Foods doesn't owe me.
    // The "Person" field is slightly ambiguous in generic tool vs specialized "Splitwise" clone.
    // User Requirement: "Net balance (You owe / They owe)"
    // This implies the "Person" entity is strictly for Debt/Loan tracking or Reimbursements.

    // Interpretation:
    // Net Balance = (Expenses tagged with Person) - (Income tagged with Person)
    // Positive = They Owe Me (Green)
    // Negative = I Owe Them (Red)

    const peopleWithBalance = useMemo(() => {
        return people.map(person => {
            const personTxs = transactions.filter(tx => tx.payeeId === person.id);

            const iPaid = personTxs
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            const theyPaid = personTxs
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                ...person,
                iPaid,
                theyPaid,
                netBalance: iPaid - theyPaid // +ve = They owe me, -ve = I owe them
            };
        });
    }, [people, transactions]);

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>People</h1>
                {/* Logic to add person manually if needed, though usually done via Transaction */}
            </header>

            <div className={styles.grid}>
                {peopleWithBalance.map(p => {
                    const isTheyOwe = p.netBalance > 0;
                    const isIOwe = p.netBalance < 0;
                    const isSettled = p.netBalance === 0;

                    return (
                        <div
                            key={p.id}
                            className={styles.card}
                            onClick={() => setSelectedPersonId(p.id)}
                        >
                            <div className={styles.cardHeader}>
                                <div className={styles.avatar}>{p.name.charAt(0)}</div>
                                <h3 className={styles.name}>{p.name}</h3>
                            </div>

                            <div className={styles.balanceRow}>
                                <span className={styles.label}>
                                    {isSettled ? 'Settled' : (isTheyOwe ? 'Owes You' : 'You Owe')}
                                </span>
                                <span className={`
                                ${styles.amount} 
                                ${isTheyOwe ? styles.green : ''}
                                ${isIOwe ? styles.red : ''}
                            `}>
                                    {formatCurrency(Math.abs(p.netBalance))}
                                </span>
                            </div>

                            <div className={styles.miniStats}>
                                <div>Debit: {formatCurrency(p.iPaid)}</div>
                                <div className={styles.divider}>•</div>
                                <div>Credit: {formatCurrency(p.theyPaid)}</div>
                            </div>
                        </div>
                    );
                })}
                {peopleWithBalance.length === 0 && (
                    <div className={styles.empty}>
                        No people added yet. Add a transaction with a person to start tracking.
                    </div>
                )}
            </div>

            {selectedPersonId && (
                <PersonDetailModal
                    personId={selectedPersonId}
                    onClose={() => setSelectedPersonId(null)}
                />
            )}
        </div>
    );
};
