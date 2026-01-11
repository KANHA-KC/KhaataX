import type { Transaction, Category, Person } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile } from '@tauri-apps/plugin-fs';

const isTauri = !!(window as any).__TAURI_INTERNALS__;

// Helper to format date
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

export const exportToCSV = async (transactions: Transaction[], categories: Category[], people: Person[], filename = 'transactions.csv') => {
    // Header
    const headers = ['Date', 'Payee/Person', 'Category', 'Type', 'Amount', 'Account', 'Notes'];

    // Rows
    const rows = transactions.map(t => {
        const category = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
        const person = people.find(p => p.id === t.payeeId)?.name || '';

        return [
            formatDate(t.date),
            person || 'General',
            category,
            t.type,
            t.amount,
            t.accountId,
            t.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');

    if (isTauri) {
        try {
            const path = await save({
                filters: [{
                    name: 'CSV File',
                    extensions: ['csv']
                }],
                defaultPath: filename
            });

            if (path) {
                try {
                    await writeTextFile(path, csvContent);
                    alert('✅ CSV exported successfully!');
                    console.log('CSV saved to:', path);
                } catch (writeErr: any) {
                    console.error('Write error:', writeErr);
                    alert(`❌ Failed to save file: ${writeErr.message || 'Unknown error'}`);
                }
            }
        } catch (dialogErr: any) {
            console.error('Dialog error:', dialogErr);
            alert(`❌ Save dialog failed: ${dialogErr.message || 'Unknown error'}`);
        }
    } else {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
};

export const exportToPDF = async (transactions: Transaction[], categories: Category[], people: Person[], filename = 'transactions.pdf') => {
    const doc = new jsPDF();

    const currency = localStorage.getItem('ledger_currency') || 'INR';
    const tableColumn = ["Date", "Payee", "Category", "Type", `Amount (${currency})`, "Notes"];
    const tableRows: any[] = [];

    transactions.forEach(t => {
        const category = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
        const person = people.find(p => p.id === t.payeeId)?.name || 'General';

        const transactionData = [
            formatDate(t.date),
            person,
            category,
            t.type.toUpperCase(),
            new Intl.NumberFormat('en-IN', {
                style: 'decimal',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(t.amount),
            t.notes || ''
        ];
        tableRows.push(transactionData);
    });

    doc.text("Transaction Report", 14, 15);
    (doc as any).setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 20);

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [30, 41, 59] },
    });

    if (isTauri) {
        try {
            const pdfOutput = doc.output('arraybuffer');
            const path = await save({
                filters: [{
                    name: 'PDF File',
                    extensions: ['pdf']
                }],
                defaultPath: filename
            });

            if (path) {
                try {
                    await writeFile(path, new Uint8Array(pdfOutput));
                    alert('✅ PDF exported successfully!');
                    console.log('PDF saved to:', path);
                } catch (writeErr: any) {
                    console.error('Write error:', writeErr);
                    alert(`❌ Failed to save PDF: ${writeErr.message || 'Unknown error'}`);
                }
            }
        } catch (dialogErr: any) {
            console.error('Dialog error:', dialogErr);
            alert(`❌ Save dialog failed: ${dialogErr.message || 'Unknown error'}`);
        }
    } else {
        doc.save(filename);
    }
};
