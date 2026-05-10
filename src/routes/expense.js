const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Gider işlemleri API rotaları.
 */

// Tüm giderleri getir
router.get('/', (req, res) => {
    try {
        const { from, to } = req.query;
        let query = 'SELECT * FROM expense';
        const params = [];

        if (from && to) {
            query += ' WHERE date BETWEEN ? AND ?';
            params.push(from, to);
        }

        query += ' ORDER BY date DESC, created_at DESC';
        const rows = db.prepare(query).all(...params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// En son girilen gideri getir
router.get('/last', (req, res) => {
    try {
        const row = db.prepare('SELECT * FROM expense ORDER BY created_at DESC LIMIT 1').get();
        res.json(row || {});
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
