import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import styles from './Input.module.css';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    label,
    error,
    fullWidth,
    className = '',
    ...props
}, ref) => {
    return (
        <div className={`${styles.wrapper} ${fullWidth ? styles.fullWidth : ''} ${className}`}>
            {label && <label className={styles.label}>{label}</label>}
            <input
                ref={ref}
                className={`${styles.input} ${error ? styles.hasError : ''}`}
                {...props}
            />
            {error && <span className={styles.errorText}>{error}</span>}
        </div>
    );
});

Input.displayName = 'Input';
