import { useState, useEffect } from 'react';
import { X, Check, Search, Calendar, DollarSign, Tag, Layers, Users } from 'lucide-react';
import styles from './FilterDrawer.module.css';
import { Button } from './ui/Button';
import { useTranslation } from '../context/LanguageContext';
import { TransliteratedInput } from './ui/TransliteratedInput';
import { normalizeForSearch } from '../utils/transliterate';

export type FilterState = {
    type: 'all' | 'income' | 'expense';
    categories: string[]; // List of selected IDs
    people: string[]; // List of selected IDs
    dateRange: {
        mode: 'all' | '7d' | '30d' | 'month' | 'custom';
        start: string;
        end: string;
    };
    amountRange: {
        min: string;
        max: string;
    };
};

export const INITIAL_FILTERS: FilterState = {
    type: 'all',
    categories: [],
    people: [],
    dateRange: { mode: 'all', start: '', end: '' },
    amountRange: { min: '', max: '' }
};

interface FilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filters: FilterState) => void;
    initialFilters: FilterState;
    availableCategories: { id: string; name: string; type: 'income' | 'expense' }[];
    availablePeople: { id: string; name: string }[];
    resultCount?: number; // Optional preview of results
}

export const FilterDrawer = ({ isOpen, onClose, onApply, initialFilters, availableCategories, availablePeople }: FilterDrawerProps) => {
    const { t, language } = useTranslation();
    // Internal state for pending changes
    const [filters, setFilters] = useState<FilterState>(initialFilters);
    const [catSearch, setCatSearch] = useState('');
    const [personSearch, setPersonSearch] = useState('');

    // Reset internal state when drawer opens
    useEffect(() => {
        if (isOpen) {
            setFilters(initialFilters);
        }
    }, [isOpen, initialFilters]);

    if (!isOpen) return null;

    // Helpers
    const toggleCategory = (id: string) => {
        setFilters(prev => {
            const current = prev.categories;
            const exists = current.includes(id);
            if (exists) {
                return { ...prev, categories: current.filter(c => c !== id) };
            } else {
                return { ...prev, categories: [...current, id] };
            }
        });
    };

    const togglePerson = (id: string) => {
        setFilters(prev => {
            const current = prev.people || [];
            const exists = current.includes(id);
            if (exists) {
                return { ...prev, people: current.filter(p => p !== id) };
            } else {
                return { ...prev, people: [...current, id] };
            }
        });
    };

    const selectDatePreset = (mode: FilterState['dateRange']['mode']) => {
        const now = new Date();
        let start = '';
        let end = now.toISOString().split('T')[0];

        if (mode === '7d') {
            const d = new Date();
            d.setDate(d.getDate() - 7);
            start = d.toISOString().split('T')[0];
        } else if (mode === '30d') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            start = d.toISOString().split('T')[0];
        } else if (mode === 'month') {
            start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
        } else if (mode === 'all') {
            start = '';
            end = '';
        }

        setFilters(prev => ({
            ...prev,
            dateRange: { mode, start, end }
        }));
    };

    const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
        setFilters(prev => ({
            ...prev,
            dateRange: { ...prev.dateRange, mode: 'custom', [field]: value }
        }));
    };

    const filteredCategories = availableCategories.filter(c => {
        if (catSearch.trim() === '') return (filters.type === 'all' || c.type === filters.type);
        const term = catSearch.trim().toLowerCase();
        const normTerm = normalizeForSearch(catSearch);
        return (
            ((filters.type === 'all' || c.type === filters.type) && c.name.toLowerCase().includes(term)) ||
            normalizeForSearch(c.name).includes(normTerm)
        );
    });

    const filteredPeople = availablePeople.filter(p => {
        if (personSearch.trim() === '') return true;
        const term = personSearch.trim().toLowerCase();
        const normTerm = normalizeForSearch(personSearch);
        return (
            p.name.toLowerCase().includes(term) ||
            normalizeForSearch(p.name).includes(normTerm)
        );
    });

    const activeCount =
        (filters.type !== 'all' ? 1 : 0) +
        (filters.categories.length > 0 ? 1 : 0) +
        ((filters.people?.length || 0) > 0 ? 1 : 0) +
        (filters.dateRange.mode !== 'all' ? 1 : 0) +
        (filters.amountRange.min || filters.amountRange.max ? 1 : 0);

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.drawer} onClick={e => e.stopPropagation()}>
                <header className={styles.header}>
                    <h2>{t('filters')}</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
                        <X size={20} />
                    </button>
                </header>

                <div className={styles.body}>
                    {/* Type Filter */}
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <Layers size={14} /> Transaction Type
                        </div>
                        <div className={styles.segmentedControl}>
                            <button
                                className={`${styles.segmentBtn} ${filters.type === 'all' ? styles.segmentActive : ''}`}
                                onClick={() => setFilters(p => ({ ...p, type: 'all' }))}
                            >
                                All
                            </button>
                            <button
                                className={`${styles.segmentBtn} ${filters.type === 'expense' ? styles.segmentActive + ' ' + styles.segmentActiveExpense : ''}`}
                                onClick={() => setFilters(p => ({ ...p, type: 'expense' }))}
                            >
                                Debit
                            </button>
                            <button
                                className={`${styles.segmentBtn} ${filters.type === 'income' ? styles.segmentActive + ' ' + styles.segmentActiveIncome : ''}`}
                                onClick={() => setFilters(p => ({ ...p, type: 'income' }))}
                            >
                                Credit
                            </button>
                        </div>
                    </section>

                    {/* Category Filter */}
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <Tag size={14} /> Categories
                            {filters.categories.length > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8em', color: 'var(--color-primary)' }}>{filters.categories.length} selected</span>}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <TransliteratedInput
                                placeholder={t('search')}
                                value={catSearch}
                                onValueChange={setCatSearch}
                                style={{ height: '36px', fontSize: '0.9rem', paddingLeft: '32px' }}
                            />
                        </div>
                        <div className={styles.categoryList}>
                            <div
                                className={`${styles.categoryItem} ${filters.categories.length === 0 ? styles.checked : ''}`}
                                onClick={() => setFilters(p => ({ ...p, categories: [] }))}
                            >
                                <div className={styles.checkbox}>
                                    {filters.categories.length === 0 && <Check size={12} />}
                                </div>
                                <span className={styles.itemLabel}>All Categories</span>
                            </div>
                            {filteredCategories.map(c => (
                                <div
                                    key={c.id}
                                    className={`${styles.categoryItem} ${filters.categories.includes(c.id) ? styles.checked : ''}`}
                                    onClick={() => toggleCategory(c.id)}
                                >
                                    <div className={styles.checkbox}>
                                        {filters.categories.includes(c.id) && <Check size={12} />}
                                    </div>
                                    <span className={styles.itemLabel}>{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* People Filter */}
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <Users size={14} /> {t('people')}
                            {(filters.people?.length || 0) > 0 && <span style={{ marginLeft: 'auto', fontSize: '0.8em', color: 'var(--color-primary)' }}>{filters.people.length} selected</span>}
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-tertiary)' }} />
                            <TransliteratedInput
                                placeholder={t('search')}
                                value={personSearch}
                                onValueChange={setPersonSearch}
                                style={{ height: '36px', fontSize: '0.9rem', paddingLeft: '32px' }}
                            />
                        </div>
                        <div className={styles.categoryList}>
                            <div
                                className={`${styles.categoryItem} ${(filters.people?.length || 0) === 0 ? styles.checked : ''}`}
                                onClick={() => setFilters(p => ({ ...p, people: [] }))}
                            >
                                <div className={styles.checkbox}>
                                    {(filters.people?.length || 0) === 0 && <Check size={12} />}
                                </div>
                                <span className={styles.itemLabel}>All People</span>
                            </div>
                            {filteredPeople.map(p => (
                                <div
                                    key={p.id}
                                    className={`${styles.categoryItem} ${filters.people?.includes(p.id) ? styles.checked : ''}`}
                                    onClick={() => togglePerson(p.id)}
                                >
                                    <div className={styles.checkbox}>
                                        {filters.people?.includes(p.id) && <Check size={12} />}
                                    </div>
                                    <span className={styles.itemLabel}>{p.name}</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Date Filter */}
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <Calendar size={14} /> Date Range
                        </div>
                        <div className={styles.chipGrid}>
                            <button
                                className={`${styles.chip} ${filters.dateRange.mode === 'all' ? styles.chipActive : ''}`}
                                onClick={() => selectDatePreset('all')}
                            >
                                All Time
                            </button>
                            <button
                                className={`${styles.chip} ${filters.dateRange.mode === '7d' ? styles.chipActive : ''}`}
                                onClick={() => selectDatePreset('7d')}
                            >
                                Last 7 Days
                            </button>
                            <button
                                className={`${styles.chip} ${filters.dateRange.mode === '30d' ? styles.chipActive : ''}`}
                                onClick={() => selectDatePreset('30d')}
                            >
                                Last 30 Days
                            </button>
                            <button
                                className={`${styles.chip} ${filters.dateRange.mode === 'month' ? styles.chipActive : ''}`}
                                onClick={() => selectDatePreset('month')}
                            >
                                This Month
                            </button>
                        </div>
                        <div className={styles.rangeInputs}>
                            <input
                                type="date"
                                className={styles.rangeInput}
                                value={filters.dateRange.start}
                                onChange={e => handleCustomDateChange('start', e.target.value)}
                            />
                            <span className={styles.separator}>to</span>
                            <input
                                type="date"
                                className={styles.rangeInput}
                                value={filters.dateRange.end}
                                onChange={e => handleCustomDateChange('end', e.target.value)}
                            />
                        </div>
                    </section>

                    {/* Amount Filter */}
                    <section className={styles.section}>
                        <div className={styles.sectionTitle}>
                            <DollarSign size={14} /> Amount Range
                        </div>
                        <div className={styles.rangeInputs}>
                            <input
                                type="number"
                                className={styles.rangeInput}
                                placeholder="Min"
                                value={filters.amountRange.min}
                                onChange={e => setFilters(p => ({ ...p, amountRange: { ...p.amountRange, min: e.target.value } }))}
                            />
                            <span className={styles.separator}>-</span>
                            <input
                                type="number"
                                className={styles.rangeInput}
                                placeholder="Max"
                                value={filters.amountRange.max}
                                onChange={e => setFilters(p => ({ ...p, amountRange: { ...p.amountRange, max: e.target.value } }))}
                            />
                        </div>
                    </section>
                </div>

                <footer className={styles.footer}>
                    <button className={styles.clearBtn} onClick={() => setFilters(INITIAL_FILTERS)}>
                        {language === 'hi' ? 'सभी साफ करें' : 'Clear All'}
                    </button>
                    <Button variant="primary" onClick={() => onApply(filters)} style={{ minWidth: '120px' }}>
                        {language === 'hi' ? `फिल्टर लागू करें ${activeCount > 0 ? `(${activeCount})` : ''}` : `Apply Filters ${activeCount > 0 ? `(${activeCount})` : ''}`}
                    </Button>
                </footer>
            </div>
        </div>
    );
};
