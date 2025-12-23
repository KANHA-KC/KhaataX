import { useMemo } from 'react';
import { useLedger } from '../context/LedgerContext';
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export interface Insight {
    id: string;
    type: 'warning' | 'success' | 'info';
    title: string;
    message: string;
    icon?: string;
}

export const useInsights = () => {
    const { transactions, categories } = useLedger();

    const insights = useMemo(() => {
        const tips: Insight[] = [];
        const now = new Date();
        const start = startOfMonth(now);
        const end = endOfMonth(now);

        // 1. Analyze Monthly Spending
        const thisMonthTx = transactions.filter(t =>
            isWithinInterval(parseISO(t.date), { start, end }) && t.type === 'expense'
        );
        const totalSpent = thisMonthTx.reduce((sum, t) => sum + t.amount, 0);

        // Simple budget rule (simulated): Warn if spending > 0 (just to show it works, or maybe > 1000)
        // In a real app we'd have user-set budgets.
        // Let's use a heuristic: Compare to last month? 
        // For MVP offline AI: Detect highest category.

        // 2. High Spending Category
        const catTotals: Record<string, number> = {};
        thisMonthTx.forEach(t => {
            catTotals[t.categoryId] = (catTotals[t.categoryId] || 0) + t.amount;
        });

        const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
        if (sortedCats.length > 0) {
            const [topCatId, amount] = sortedCats[0];
            const catName = categories.find(c => c.id === topCatId)?.name || 'Unknown';
            const percent = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;

            if (percent > 40) {
                tips.push({
                    id: 'high-cat',
                    type: 'warning',
                    title: 'High Category Concentration',
                    message: `Gemini notices that **${catName}** accounts for ${percent}% of your spending this month. Consider setting a cap.`
                });
            } else {
                tips.push({
                    id: 'balanced-cat',
                    type: 'info',
                    title: 'Spending Analysis',
                    message: `Your highest expense is **${catName}** (${percent}%). Your spending seems relatively balanced.`
                });
            }
        }

        // 3. Frequent Small Purchases (Latte Factor)
        // Count tx < 100 (currency units)
        const smallTx = thisMonthTx.filter(t => t.amount < 100);
        if (smallTx.length > 10) {
            tips.push({
                id: 'small-tx',
                type: 'warning',
                title: 'Micropayment Alert',
                message: `You've made ${smallTx.length} small purchases (< 100) this month. These add up! Try grouping them.`
            });
        }

        // 4. Savings Opportunity
        // If income > expense, suggest saving.
        const income = transactions
            .filter(t => isWithinInterval(parseISO(t.date), { start, end }) && t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const savings = income - totalSpent;
        if (savings > 0) {
            tips.push({
                id: 'save-opp',
                type: 'success',
                title: 'Savings Potential',
                message: `Great job! You have a surplus of ${savings.toLocaleString()} this month. Gemini recommends moving 20% to savings.`
            });
        } else if (savings < 0) {
            tips.push({
                id: 'deficit',
                type: 'warning',
                title: 'Budget Deficit',
                message: `You are spending more than you earn this month (Deficit: ${Math.abs(savings).toLocaleString()}). Review your non-essential expenses.`
            });
        }

        if (tips.length === 0) {
            tips.push({
                id: 'no-data',
                type: 'info',
                title: 'Gathering Data',
                message: "Gemini is analyzing your spending patterns. Add more transactions to get personalized tips."
            });
        }

        return tips.slice(0, 3); // Return top 3 tips
    }, [transactions, categories]);

    return insights;
};
