import React from 'react';
import styles from './Logo.module.css';

interface LogoProps {
    className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
    return (
        <div className={`${styles.logoContainer} ${className || ''}`}>

            <div className={styles.text}>
                Khaata<span className={styles.highlight}>X</span>
            </div>
        </div>
    );
};
