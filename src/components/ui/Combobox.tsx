import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import { Input } from './Input';
import styles from './Combobox.module.css';

interface Option {
    id: string;
    label: string;
}

interface ComboboxProps {
    label?: string;
    // value and inputValue removed from interface or kept but optional/unused warning ignored?
    // Better to keep if intended for controlled mode later, but let's comment out to clean linter.
    // value?: string; 
    // inputValue?: string;
    options: Option[];
    onChange: (option: Option | null) => void;
    onCreate?: (label: string) => void;
    placeholder?: string;
    fullWidth?: boolean;
    autoFocus?: boolean;
}

export const Combobox: React.FC<ComboboxProps> = ({
    label,
    options,
    onChange,
    onCreate,
    placeholder,
    fullWidth,
    autoFocus
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter options
    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        // If we have an initial value/label, set search term to it?
        // Actually, consuming pattern usually: 
        // Parent keeps track of "selectedId" and "selectedLabel".
        // When "selectedId" creates a match, we might show that.
        // But for "Person", we might want to type "A..." and see "Alice".
    }, []);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setIsOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(i => Math.min(i + 1, filteredOptions.length + (onCreate ? 0 : -1)));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex]);
                } else if (onCreate && searchTerm.trim()) {
                    handleCreate();
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const handleSelect = (opt: Option) => {
        onChange(opt);
        setSearchTerm(opt.label);
        setIsOpen(false);
    };

    const handleCreate = () => {
        if (onCreate && searchTerm.trim()) {
            onCreate(searchTerm.trim());
            setIsOpen(false);
        }
    }

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''}`} ref={containerRef}>
            <Input
                ref={inputRef}
                label={label}
                value={searchTerm}
                onChange={e => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                    setHighlightedIndex(0);
                    if (e.target.value === '') {
                        onChange(null); // Clear selection
                    }
                }}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                fullWidth
                autoComplete="off"
                autoFocus={autoFocus}
            />

            {isOpen && (filteredOptions.length > 0 || (onCreate && searchTerm)) && (
                <ul className={styles.menu}>
                    {filteredOptions.map((opt, index) => (
                        <li
                            key={opt.id}
                            className={`${styles.item} ${index === highlightedIndex ? styles.highlighted : ''}`}
                            onClick={() => handleSelect(opt)}
                        >
                            {opt.label}
                        </li>
                    ))}
                    {/* Create Option */}
                    {onCreate && searchTerm && !filteredOptions.find(o => o.label.toLowerCase() === searchTerm.toLowerCase()) && (
                        <li
                            className={`${styles.item} ${styles.create} ${highlightedIndex === filteredOptions.length ? styles.highlighted : ''}`}
                            onClick={handleCreate}
                        >
                            Create "{searchTerm}"
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};
