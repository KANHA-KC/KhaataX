import { useState, useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Plus, Edit2, X, Calendar, Scale } from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { v4 as uuidv4 } from 'uuid';
import type { StockItem } from '../types';
import { format } from 'date-fns';
import styles from './StockDashboard.module.css';
import { useTranslation } from '../context/LanguageContext';
import { TransliteratedInput } from './ui/TransliteratedInput';

export const StockDashboard = () => {
    const { t } = useTranslation();
    const { stocks, addStock, updateStock, deleteStock } = useLedger();

    // Modal State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

    // Form State (11 Fields)
    const [partyName, setPartyName] = useState('');
    const [marfad, setMarfad] = useState('');
    const [loadingDate, setLoadingDate] = useState('');
    const [weight01, setWeight01] = useState('');
    const [coldWeight, setColdWeight] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [noOfTins, setNoOfTins] = useState('');
    const [loanAmount, setLoanAmount] = useState('');
    const [loanDate, setLoanDate] = useState('');
    const [principalAmount, setPrincipalAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');

    const totalLoan = useMemo(() => {
        return stocks.reduce((sum, item) => sum + (item.loanAmount || 0), 0);
    }, [stocks]);

    const totalPrincipal = useMemo(() => {
        return stocks.reduce((sum, item) => sum + (item.principalAmount || 0), 0);
    }, [stocks]);

    const openAddModal = (item?: StockItem) => {
        if (item) {
            setSelectedItem(item);
            setPartyName(item.partyName);
            setMarfad(item.marfad);
            setLoadingDate(item.loadingDate);
            setWeight01(item.weight01.toString());
            setColdWeight(item.coldWeight.toString());
            setLotNumber(item.lotNumber);
            setNoOfTins(item.noOfTins.toString());
            setLoanAmount(item.loanAmount.toString());
            setLoanDate(item.loanDate);
            setPrincipalAmount(item.principalAmount.toString());
            setInterestRate(item.interestRate.toString());
        } else {
            setSelectedItem(null);
            setPartyName('');
            setMarfad('');
            setLoadingDate(format(new Date(), 'yyyy-MM-dd'));
            setWeight01('');
            setColdWeight('');
            setLotNumber('');
            setNoOfTins('');
            setLoanAmount('');
            setLoanDate(format(new Date(), 'yyyy-MM-dd'));
            setPrincipalAmount('');
            setInterestRate('');
        }
        setIsAddModalOpen(true);
    };

    const handleSaveItem = async () => {
        if (!partyName) return; // Basic validation

        const newItem: StockItem = {
            id: selectedItem?.id || uuidv4(),
            partyName,
            marfad,
            loadingDate,
            weight01: parseFloat(weight01) || 0,
            coldWeight: parseFloat(coldWeight) || 0,
            lotNumber,
            noOfTins: parseInt(noOfTins) || 0,
            loanAmount: parseFloat(loanAmount) || 0,
            loanDate,
            principalAmount: parseFloat(principalAmount) || 0,
            interestRate: parseFloat(interestRate) || 0,
            updatedAt: Date.now()
        };

        if (selectedItem) {
            await updateStock(newItem);
        } else {
            await addStock(newItem);
        }
        setIsAddModalOpen(false);
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1>{t('stock_management')}</h1>
                    <p style={{ color: 'hsl(var(--color-text-secondary))' }}>{t('agricultural_lots')}</p>
                </div>
                <Button variant="primary" onClick={() => openAddModal()}>
                    <Plus size={18} style={{ marginRight: 8 }} />
                    {t('add_lot')}
                </Button>
            </div>

            <div className={styles.summaryCards}>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>{t('principal_amount')}</span>
                    <span className={styles.cardValue}>{formatCurrency(totalPrincipal)}</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>{t('loan_amount')}</span>
                    <span className={styles.cardValue}>{formatCurrency(totalLoan)}</span>
                </div>
                <div className={styles.card}>
                    <span className={styles.cardTitle}>{t('active_lots')}</span>
                    <span className={styles.cardValue}>{stocks.length}</span>
                </div>
            </div>

            <div className={styles.grid}>
                {stocks.map(item => (
                    <div key={item.id} className={styles.stockCard}>
                        <div className={styles.itemHeader}>
                            <div>
                                <div className={styles.itemName}>{item.partyName}</div>
                                <div className={styles.itemSubText}>{item.marfad}</div>
                            </div>
                            <div className={styles.badge}>{item.lotNumber}</div>
                        </div>

                        <div className={styles.detailsGrid}>
                            <div className={styles.detailItem}>
                                <Calendar size={12} />
                                <span>{t('loading_date')}: {item.loadingDate}</span>
                            </div>
                            <div className={styles.detailItem}>
                                <Scale size={12} />
                                <span>{item.noOfTins} {t('no_of_tins')}</span>
                            </div>
                        </div>

                        <div className={styles.statsGrid}>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>{t('weight_01')}</span>
                                <span className={styles.statValue}>{item.weight01}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>{t('cold_weight')}</span>
                                <span className={styles.statValue}>{item.coldWeight}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>{t('principal_amount')}</span>
                                <span className={styles.statValue}>{formatCurrency(item.principalAmount)}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.statLabel}>{t('loan_amount')}</span>
                                <span className={styles.statValue}>{formatCurrency(item.loanAmount)}</span>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.btnEditOutline} onClick={() => openAddModal(item)}>
                                <Edit2 size={14} style={{ marginRight: 4 }} /> {t('edit_details')}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add/Edit Modal - 11 Fields */}
            {isAddModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{selectedItem ? t('edit_details') : t('add_lot')}</h2>
                            <button className={styles.btnIcon} onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
                        </div>

                        <div className={styles.scrollableForm}>
                            <h3 className={styles.sectionTitle}>Party Information</h3>
                            <div className={styles.formRow}>
                                <TransliteratedInput label={t('party_name')} value={partyName} onValueChange={setPartyName} placeholder="e.g. Jai Gurudev" />
                                <TransliteratedInput label={t('marfad')} value={marfad} onValueChange={setMarfad} placeholder="e.g. Kisaan Name" />
                            </div>

                            <h3 className={styles.sectionTitle}>Stock Details</h3>
                            <div className={styles.formRow}>
                                <Input label={t('loading_date')} type="date" value={loadingDate} onChange={e => setLoadingDate(e.target.value)} />
                                <Input label={t('lot_no')} value={lotNumber} onChange={e => setLotNumber(e.target.value)} placeholder="Lot #123" />
                            </div>
                            <div className={styles.formRowSingle}>
                                <Input label={t('no_of_tins')} type="number" value={noOfTins} onChange={e => setNoOfTins(e.target.value)} />
                            </div>
                            <div className={styles.formRow}>
                                <Input label={t('weight_01')} type="number" value={weight01} onChange={e => setWeight01(e.target.value)} />
                                <Input label={t('cold_weight')} type="number" value={coldWeight} onChange={e => setColdWeight(e.target.value)} />
                            </div>

                            <h3 className={styles.sectionTitle}>Financial Details</h3>
                            <div className={styles.formRow}>
                                <Input label={t('principal_amount')} type="number" value={principalAmount} onChange={e => setPrincipalAmount(e.target.value)} />
                                <Input label={t('interest_rate')} type="number" value={interestRate} onChange={e => setInterestRate(e.target.value)} placeholder="%" />
                            </div>
                            <div className={styles.formRow}>
                                <Input label={t('loan_amount')} type="number" value={loanAmount} onChange={e => setLoanAmount(e.target.value)} />
                                <Input label={t('loan_date')} type="date" value={loanDate} onChange={e => setLoanDate(e.target.value)} />
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            {selectedItem && (
                                <Button variant="ghost" style={{ color: 'hsl(var(--color-danger))', marginRight: 'auto' }} onClick={async () => {
                                    if (confirm(t('delete_permanently'))) {
                                        await deleteStock(selectedItem.id);
                                        setIsAddModalOpen(false);
                                    }
                                }}>{t('delete_permanently')}</Button>
                            )}
                            <Button variant="primary" onClick={handleSaveItem}>{t('save')}</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
