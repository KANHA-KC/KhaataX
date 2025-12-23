import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';
import styles from './Input.module.css'; // Reuse input styles for consistency

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    options: { label: string; value: string }[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
    label,
    error,
    fullWidth,
    options,
    className = '',
    ...props
}, ref) => {
    return (
        <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <select
                ref={ref}
                className={`${styles.input} ${error ? styles.hasError : ''}`}
                {...props}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
});

Select.displayName = 'Select';
