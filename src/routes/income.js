const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Gelir işlemleri API rotaları.
 */

// Tüm gelirleri getir (filtre: date)
router.get('/', (req, res) => {
    try {
        const { from, to } = req.query;
        let query = 'SELECT * FROM income';
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
 
// En son girilen kaydı getir (Hatırlatıcı özelliği için)
router.get('/last', (req, res) => {
    try {
        const row = db.prepare('SELECT * FROM income ORDER BY created_at DESC LIMIT 1').get();
        res.json(row || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni gelir ekle
router.post('/', (req, res) => {
    try {
        const { 
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, 
            pos_status, pos_expected_date, note 
        } = req.body;

        const stmt = db.prepare(`
            INSERT INTO income (
                date, vehicle_count, unit_fee, total_amount, 
                payment_method, cash_amount, card_amount, 
                pos_status, pos_expected_date, note
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const info = stmt.run(
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, 
            pos_status, pos_expected_date, note
        );

        res.json({ id: info.lastInsertRowid });
    } catch (error) {
        console.error('Income POST error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Gelir güncelle
router.put('/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { 
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, 
            pos_status, pos_expected_date, note 
        } = req.body;

        const stmt = db.prepare(`
            UPDATE income SET 
                date = ?, vehicle_count = ?, unit_fee = ?, total_amount = ?, 
                payment_method = ?, cash_amount = ?, card_amount = ?, 
                pos_status = ?, pos_expected_date = ?, note = ?
            WHERE id = ?
        `);

        stmt.run(
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, 
            pos_status, pos_expected_date, note, id
        );

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POS durumunu güncelle
router.put('/:id/pos-status', (req, res) => {
    try {
        const { id } = req.params;
        const { pos_status, pos_collected_date } = req.body;

        const stmt = db.prepare('UPDATE income SET pos_status = ?, pos_collected_date = ? WHERE id = ?');
        stmt.run(pos_status, pos_collected_date, id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Gelir sil
router.delete('/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM income WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
