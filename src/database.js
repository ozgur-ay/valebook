const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

/**
 * SQLite veritabanı yönetim modülü.
 * Veriler kullanıcının APPDATA klasöründe 'valebook' dizini altında saklanır.
 */

const appDataDir = process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share');
const dbDir = path.join(appDataDir, 'ValeBook');

// Klasör yoksa oluştur
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'valebook.db');
const db = new Database(dbPath);

// --- Veritabanı Şeması ---
db.exec(`
    -- Gelirler tablosu
    CREATE TABLE IF NOT EXISTS income (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT DEFAULT (date('now')),
        vehicle_count INTEGER,
        unit_fee REAL,
        total_amount REAL,
        cash_amount REAL,
        card_amount REAL DEFAULT 0,
        pos_collected_amount REAL DEFAULT 0,
        payment_method TEXT, -- 'cash', 'credit_card', 'mixed'
        pos_status TEXT DEFAULT 'na', -- 'na', 'pending', 'collected', 'cancelled'
        pos_expected_date TEXT,
        pos_collected_date TEXT,
        note TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Giderler tablosu
    CREATE TABLE IF NOT EXISTS expense (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE DEFAULT CURRENT_DATE,
        category TEXT,
        description TEXT,
        amount REAL,
        payment_method TEXT,
        document_no TEXT,
        note TEXT,
        is_deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Ayarlar tablosu
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    -- Gider Kategorileri tablosu
    CREATE TABLE IF NOT EXISTS expense_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        is_default INTEGER DEFAULT 0
    );

    -- Tarife Geçmişi
    CREATE TABLE IF NOT EXISTS tariff_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fee REAL,
        effective_date TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
`);

// --- Veritabanı Yamaları (Migrations) ---
// Mevcut tabloların üzerine eksik sütunları eklemek için kullanılır
const applyMigrations = () => {
    const columns = [
        { table: 'income', column: 'pos_status', type: 'TEXT DEFAULT "na"' },
        { table: 'income', column: 'pos_collected_amount', type: 'REAL DEFAULT 0' },
        { table: 'income', column: 'pos_expected_date', type: 'TEXT' },
        { table: 'income', column: 'pos_collected_date', type: 'TEXT' },
        { table: 'income', column: 'is_deleted', type: 'INTEGER DEFAULT 0' },
        { table: 'expense', column: 'is_deleted', type: 'INTEGER DEFAULT 0' }
    ];

    columns.forEach(m => {
        try {
            db.exec(`ALTER TABLE ${m.table} ADD COLUMN ${m.column} ${m.type}`);
            console.log(`Migration applied: ${m.table}.${m.column}`);
        } catch (e) {
            // Sütun zaten varsa hata verecektir, sessizce geçiyoruz
            if (!e.message.includes('duplicate column name')) {
                console.error(`Migration error (${m.table}.${m.column}):`, e.message);
            }
        }
    });
};

applyMigrations();

// --- Varsayılan Veriler ---
const setupDefaults = () => {
    // Varsayılan Kategoriler
    const categories = [
        'Personel', 'Aidat', 'Bakım-Onarım', 'Vergi', 
        'Sigorta', 'POS Komisyonu', 'Malzeme/Sarf', 'Diğer'
    ];
    
    const categoryStmt = db.prepare('INSERT OR IGNORE INTO expense_categories (name, is_default) VALUES (?, 1)');
    categories.forEach(cat => categoryStmt.run(cat));

    // Varsayılan Ayarlar
    const defaultSettings = [
        { key: 'business_name', value: 'Cafe Vale Otopark' },
        { key: 'pos_commission_rate', value: '0' }
    ];
    
    const settingsStmt = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
    defaultSettings.forEach(s => settingsStmt.run(s.key, s.value));
};

setupDefaults();

module.exports = db;
