const db = require('./src/database');
const rows = db.prepare('SELECT id, date, card_amount, payment_method, pos_status FROM income WHERE is_deleted = 0 AND payment_method IN ("credit_card", "mixed")').all();
console.log('--- Pending/POS Entries ---');
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
