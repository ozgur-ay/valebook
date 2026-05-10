const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Uygulama ayarları ve kategori yönetimi API rotaları.
 */

// Tüm ayarları getir
router.get('/', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM settings').all();
        const settings = {};
        rows.forEach(row => settings[row.key] = row.value);
        res.json(settings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Ayarları güncelle
router.put('/', (req, res) => {
    try {
        const settings = req.body;
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
        
        const transaction = db.transaction((data) => {
            for (const [key, value] of Object.entries(data)) {
                stmt.run(key, String(value));
            }
        });

        transaction(settings);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gider kategorilerini getir
router.get('/categories', (req, res) => {
    try {
        const rows = db.prepare('SELECT * FROM expense_categories ORDER BY is_default DESC, name ASC').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni kategori ekle
router.post('/categories', (req, res) => {
    try {
        const { name } = req.body;
        const info = db.prepare('INSERT INTO expense_categories (name) VALUES (?)').run(name);
        res.json({ id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Kategori sil
router.delete('/categories/:id', (req, res) => {
    try {
        const { id } = req.params;
        
        const category = db.prepare('SELECT name FROM expense_categories WHERE id = ?').get(id);
        if (!category) {
            return res.status(404).json({ error: 'Kategori bulunamadı.' });
        }

        const countRow = db.prepare('SELECT COUNT(*) as cnt FROM expense WHERE category = ?').get(category.name);
        if (countRow.cnt > 0) {
            return res.status(400).json({ error: 'Bu kategoriyle ilişkili gider kayıtları bulunmaktadır. Öncelikle ilişkili giderleri silmelisiniz.' });
        }

        db.prepare('DELETE FROM expense_categories WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
