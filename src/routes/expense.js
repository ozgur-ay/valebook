const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Gider işlemleri API rotaları.
 */

// Gider listesini getir (Konsolide)
router.get('/', (req, res) => {
    try {
        const { from, to } = req.query;
        let baseQuery = `
            SELECT 
                date,
                'Günlük Toplam' as category,
                'İşletme Giderleri Toplamı' as description,
                SUM(amount) as amount
            FROM expense 
            WHERE is_deleted = 0
        `;
        const params = [];

        if (from && to) {
            baseQuery += ' AND date BETWEEN ? AND ?';
            params.push(from, to);
        }

        baseQuery += ' GROUP BY date ORDER BY date DESC LIMIT 50';
        const rows = db.prepare(baseQuery).all(...params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// En son girilen gideri getir (Hatırlatıcı için)
router.get('/last', (req, res) => {
    try {
        const row = db.prepare('SELECT * FROM expense WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 1').get();
        res.json(row || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Geri Al
router.post('/undo', (req, res) => {
    try {
        const last = db.prepare('SELECT id FROM expense WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 1').get();
        if (last) {
            db.prepare('UPDATE expense SET is_deleted = 1 WHERE id = ?').run(last.id);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'İşlem yok' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// İleri Al
router.post('/redo', (req, res) => {
    try {
        const lastDeleted = db.prepare('SELECT id FROM expense WHERE is_deleted = 1 ORDER BY created_at DESC LIMIT 1').get();
        if (lastDeleted) {
            db.prepare('UPDATE expense SET is_deleted = 0 WHERE id = ?').run(lastDeleted.id);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'İşlem yok' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni gider ekle
router.post('/', (req, res) => {
    try {
        const { date, category, description, amount, payment_method, document_no, note } = req.body;

        const stmt = db.prepare(`
            INSERT INTO expense (date, category, description, amount, payment_method, document_no, note)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(date, category, description, amount, payment_method, document_no, note);
        res.json({ id: info.lastInsertRowid });
    } catch (error) {
        console.error('Expense POST error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Gider güncelle
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { date, category, description, amount, payment_method, document_no, note } = req.body;

        const stmt = db.prepare(`
            UPDATE expense SET 
                date = ?, category = ?, description = ?, amount = ?, 
                payment_method = ?, document_no = ?, note = ?
            WHERE id = ?
        `);

        stmt.run(date, category, description, amount, payment_method, document_no, note, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gider sil
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM expense WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
