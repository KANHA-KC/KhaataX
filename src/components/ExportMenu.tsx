import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { Button } from './ui/Button';
import styles from './ExportMenu.module.css';

interface ExportMenuProps {
    onExportCSV: () => void;
    onExportPDF: () => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ onExportCSV, onExportPDF }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={styles.menuContainer} ref={menuRef}>
            <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} title="Download Data">
                <Download size={18} />
            </Button>

            {isOpen && (
                <div className={styles.dropdown}>
                    <button className={styles.menuItem} onClick={() => { onExportCSV(); setIsOpen(false); }}>
                        <Table size={16} className={styles.icon} />
                        Download as Excel (CSV)
                    </button>
                    <button className={styles.menuItem} onClick={() => { onExportPDF(); setIsOpen(false); }}>
                        <FileText size={16} className={styles.icon} />
                        Download as PDF
                    </button>
                </div>
            )}
        </div>
    );
};
