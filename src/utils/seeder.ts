import { v4 as uuidv4 } from 'uuid';
import { dbService } from '../services/db';
import { DEFAULT_CATEGORIES } from '../types';
import type { Transaction, Person } from '../types';

const SAMPLE_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona', 'George', 'Hannah'];
const SAMPLE_NOTES = ['Dinner', 'Groceries', 'Uber', 'Drinks', 'Movie', 'Rent check', 'Gift', 'Coffee', 'Lunch', 'Supplies'];

function randomDate(start: Date, end: Date) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

export async function seedData(count: number = 100) {
    // 1. Ensure we have some people
    let people = await dbService.getAllPeople();
    if (people.length < 3) {
        const newPeople: Person[] = SAMPLE_NAMES.slice(0, 5).map(name => ({
            id: uuidv4(),
            name,
            createdAt: Date.now()
        }));
        for (const p of newPeople) {
            await dbService.addPerson(p);
        }
        people = await dbService.getAllPeople();
    }

    const categories = await dbService.getAllCategories();
    const accounts = await dbService.getAllAccounts();

    const transactions: Transaction[] = [];
    const now = new Date();
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    for (let i = 0; i < count; i++) {
        const isExpense = Math.random() > 0.3; // 70% expenses
        const type = isExpense ? 'expense' : 'income';

        // Random category based on type
        const typeCats = categories.filter(c => c.type === type);
        const category = typeCats[Math.floor(Math.random() * typeCats.length)];

        // Random person (sometimes null)
        const person = Math.random() > 0.5 ? people[Math.floor(Math.random() * people.length)] : null;

        // Random amount 10 - 5000
        const amount = Math.floor(Math.random() * 4990) + 10;

        const date = randomDate(threeMonthsAgo, now).toISOString();

        const tx: Transaction = {
            id: uuidv4(),
            date,
            amount,
            type,
            categoryId: category?.id || DEFAULT_CATEGORIES[0].id,
            accountId: accounts[0].id, // Default to Cash/Main for simplicity
            payeeId: person?.id,
            notes: SAMPLE_NOTES[Math.floor(Math.random() * SAMPLE_NOTES.length)],
            createdAt: Date.now()
        };

        transactions.push(tx);
    }

    for (const tx of transactions) {
        await dbService.addTransaction(tx);
    }

    console.log(`Seeded ${count} transactions.`);
    return true;
}
