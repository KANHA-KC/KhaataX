import type { Transaction, Category, Person } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


// Helper to format date
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString();

export const exportToCSV = (transactions: Transaction[], categories: Category[], people: Person[], filename = 'transactions.csv') => {
    // Header
    const headers = ['Date', 'Payee/Person', 'Category', 'Type', 'Amount', 'Account', 'Notes'];

    // Rows
    const rows = transactions.map(t => {
        const category = categories.find(c => c.id === t.categoryId)?.name || 'Uncategorized';
        const person = people.find(p => p.id === t.payeeId)?.name || '';
        // const payee = person || t.notes || 'Unknown'; // Fallback logic removed as unused

        // Note: In our app logic, payeeId links to Person. If null, it's a general transaction, usually we use notes or a generic "Payee" field if we had one.
        // For CSV, let's use Person Name or "General".

        return [
            formatDate(t.date),
            person || 'General',
            category,
            t.type,
            t.amount,
            t.accountId,
            t.notes || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','); // Escape quotes
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
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
};

export const exportToPDF = (transactions: Transaction[], categories: Category[], people: Person[], filename = 'transactions.pdf') => {
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
        headStyles: { fillColor: [30, 41, 59] }, // Slate-800
    });

    doc.save(filename);
};
