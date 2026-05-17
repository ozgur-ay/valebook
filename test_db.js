const Database = require('better-sqlite3');
const path = require('path');

const appDataDir = process.env.APPDATA || process.env.HOME + '/.local/share';
const dbPath = path.join(appDataDir, 'ValeBook', 'valebook.db');
const db = new Database(dbPath);

const from = '2026-05-01';
const to = '2026-05-17';

console.log('--- DATABASE DIAGNOSTIC v1.1.126 ---');
console.log('Path:', dbPath);

try {
    const rawIncome = db.prepare(`
        SELECT COUNT(*) as count, MIN(date) as first, MAX(date) as last 
        FROM income 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND date(date) BETWEEN date(?) AND date(?)
    `).get(from, to);
    console.log('Income in Range:', rawIncome);

    const rawExpense = db.prepare(`
        SELECT COUNT(*) as count FROM expense 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        AND date(date) BETWEEN date(?) AND date(?)
    `).get(from, to);
    console.log('Expense in Range:', rawExpense);

    const sample = db.prepare('SELECT date, vehicle_count, total_amount FROM income WHERE is_deleted = 0 LIMIT 3').all();
    console.log('Sample Rows:', sample);

} catch (e) {
    console.error('ERROR:', e.message);
}
