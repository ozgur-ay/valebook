const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Gelir işlemleri API rotaları.
 */

// Gelir listesini getir (Tarih bazında konsolide)
router.get('/', (req, res) => {
    try {
        const { from, to } = req.query;
        let baseQuery = `
            SELECT 
                date,
                SUM(vehicle_count) as vehicle_count,
                SUM(cash_amount) as cash_amount,
                SUM(card_amount) as card_amount,
                SUM(iban_amount) as iban_amount,
                SUM(total_amount) as total_amount,
                GROUP_CONCAT(
                    id || ':::' || unit_fee || ':::' || vehicle_count || ':::' || total_amount || ':::' || payment_method || ':::' || IFNULL(note, '') || ':::' || IFNULL(iban_amount, 0),
                    ';;;'
                ) as details
            FROM income 
            WHERE is_deleted = 0
        `;
        const params = [];

        if (from && to) {
            baseQuery += ' AND date BETWEEN ? AND ?';
            params.push(from, to);
        }

        baseQuery += ' GROUP BY date ORDER BY date DESC LIMIT 100';
        const rows = db.prepare(baseQuery).all(...params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
 
// En son girilen ham kaydı getir (Hatırlatıcı için)
router.get('/last', (req, res) => {
    try {
        const row = db.prepare('SELECT * FROM income WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 1').get();
        res.json(row || {});
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Geri Al (Undo)
router.post('/undo', (req, res) => {
    try {
        const last = db.prepare('SELECT id FROM income WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 1').get();
        if (last) {
            db.prepare('UPDATE income SET is_deleted = 1 WHERE id = ?').run(last.id);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'Geri alınacak işlem kalmadı.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// İleri Al (Redo)
router.post('/redo', (req, res) => {
    try {
        const lastDeleted = db.prepare('SELECT id FROM income WHERE is_deleted = 1 ORDER BY created_at DESC LIMIT 1').get();
        if (lastDeleted) {
            db.prepare('UPDATE income SET is_deleted = 0 WHERE id = ?').run(lastDeleted.id);
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'İleri alınacak işlem kalmadı.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Tanı/Hata Ayıklama Rotası (Tüm Ham Kayıtları Göster)
router.get('/debug-db', (req, res) => {
    try {
        const rows = db.prepare('SELECT id, date, payment_method, pos_status, card_amount, pos_collected_amount FROM income WHERE is_deleted = 0 ORDER BY id DESC LIMIT 50').all();
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Bekleyen ve Son Tahsil Edilen POS işlemlerini getir (Şeffaflık için)
router.get('/pending-pos', (req, res) => {
    try {
        const { from, to } = req.query;
        let query = `
            SELECT * FROM income 
            WHERE payment_method IN ('credit_card', 'mixed') 
            AND is_deleted = 0 
        `;
        const params = [];

        if (from && to) {
            query += ` AND date BETWEEN ? AND ? `;
            params.push(from, to);
        } else {
            // Filtre yoksa varsayılan: Bekleyenler + son 7 günün tahsilatları
            query += ` AND (pos_status = 'pending' OR (pos_status = 'collected' AND pos_collected_date >= date('now', '-7 days'))) `;
        }

        query += ` ORDER BY pos_status DESC, date DESC LIMIT 100 `;
        
        const rows = db.prepare(query).all(...params);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Belirli bir tutarı bankadan tahsil et (FIFO Mantığı)
router.post('/collect-amount', (req, res) => {
    try {
        let { amount } = req.body;
        amount = parseFloat(amount);
        if (isNaN(amount) || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });

        // Komisyon ayarını al
        const setting = db.prepare("SELECT value FROM settings WHERE key = 'pos_commission_rate'").get();
        const rate = setting ? parseFloat(setting.value) : 0;

        // Tahsilatı bekleyen veya eksik tahsil edilmiş tüm POS kayıtlarını getir (En eski tarihten başla)
        const pending = db.prepare(`
            SELECT * FROM income 
            WHERE payment_method IN ('credit_card', 'mixed') 
            AND pos_status != 'collected' 
            AND is_deleted = 0 
            ORDER BY date ASC, id ASC
        `).all();

        let remainingAmount = amount;
        const updates = [];

        for (const item of pending) {
            if (remainingAmount <= 0) break;

            const netExpected = item.card_amount * (1 - rate / 100);
            const alreadyCollected = item.pos_collected_amount || 0;
            const needsMore = netExpected - alreadyCollected;

            if (needsMore <= 0) continue;

            const canTake = Math.min(remainingAmount, needsMore);
            const newCollectedTotal = alreadyCollected + canTake;
            remainingAmount -= canTake;

            const newStatus = (newCollectedTotal >= netExpected - 0.01) ? 'collected' : 'pending';
            
            updates.push({
                id: item.id,
                collected: newCollectedTotal,
                status: newStatus,
                date: new Date().toISOString() // Milisaniye hassasiyetiyle batch ayırımı sağlar
            });
        }

        // Güncellemeleri uygula
        const updateStmt = db.prepare('UPDATE income SET pos_collected_amount = ?, pos_status = ?, pos_collected_date = ? WHERE id = ?');
        const transaction = db.transaction((rows) => {
            for (const r of rows) {
                updateStmt.run(r.collected, r.status, r.date, r.id);
            }
        });
        transaction(updates);

        res.json({ success: true, processed_updates: updates.length, remaining: remainingAmount });
    } catch (error) {
        console.error('Collect amount error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Tüm bekleyen POS'ları tek tıkla tahsil et
router.post('/collect-all-pos', (req, res) => {
    try {
        const commissionSetting = db.prepare("SELECT value FROM settings WHERE key = 'pos_commission_rate'").get();
        const rate = commissionSetting ? parseFloat(commissionSetting.value) : 0;
        
        // Önemli: Tüm bekleyenlerin collected_amount değerini net beklentiye eşitle
        db.prepare(`
            UPDATE income 
            SET pos_status = 'collected', 
                pos_collected_date = ?, 
                pos_collected_amount = card_amount * (1 - ? / 100)
            WHERE payment_method IN ('credit_card', 'mixed') 
            AND pos_status != 'collected' 
            AND is_deleted = 0
        `).run(new Date().toISOString(), rate);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Son yapılan tahsilat işlemini geri al
router.post('/undo-collection', (req, res) => {
    try {
        // En son tahsil edilen kayıtların tarihini bul
        const lastBatch = db.prepare(`
            SELECT pos_collected_date 
            FROM income 
            WHERE pos_status = 'collected' 
            AND is_deleted = 0 
            ORDER BY pos_collected_date DESC, id DESC 
            LIMIT 1
        `).get();

        if (!lastBatch || !lastBatch.pos_collected_date) {
            return res.status(404).json({ error: 'Geri alınacak tahsilat bulunamadı.' });
        }

        // O tarihteki/partideki kayıtları geri al
        // Not: Gerçek bir 'batch id' olmadığı için şimdilik o günkü tüm son işlemleri çeviriyoruz
        // Daha hassas olması için son 1 dakika içinde güncellenenleri tercih edebiliriz (eğer timestamp varsa)
        // Şimdilik basitleştirilmiş mantık:
        db.prepare(`
            UPDATE income 
            SET pos_status = 'pending', 
                pos_collected_amount = 0, 
                pos_collected_date = NULL 
            WHERE pos_collected_date = ? 
            AND pos_status = 'collected' 
            AND is_deleted = 0
        `).run(lastBatch.pos_collected_date);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Yeni gelir ekle
router.post('/', (req, res) => {
    try {
        const { 
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, iban_amount,
            pos_status, pos_expected_date, note 
        } = req.body;

        const stmt = db.prepare(`
            INSERT INTO income (
                date, vehicle_count, unit_fee, total_amount, 
                payment_method, cash_amount, card_amount, iban_amount,
                pos_status, pos_expected_date, note, pos_collected_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `);

        // Yeni eklenen POS'lar her zaman 'pending' başlar
        let finalPosStatus = pos_status || 'na';
        if (payment_method === 'credit_card' || payment_method === 'mixed') {
            finalPosStatus = 'pending';
        }

        const info = stmt.run(
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, iban_amount || 0,
            finalPosStatus, pos_expected_date, note
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
            payment_method, cash_amount, card_amount, iban_amount,
            pos_status, pos_expected_date, note 
        } = req.body;

        const stmt = db.prepare(`
            UPDATE income SET 
                date = ?, vehicle_count = ?, unit_fee = ?, total_amount = ?, 
                payment_method = ?, cash_amount = ?, card_amount = ?, iban_amount = ?,
                pos_status = ?, pos_expected_date = ?, note = ?
            WHERE id = ?
        `);

        stmt.run(
            date, vehicle_count, unit_fee, total_amount, 
            payment_method, cash_amount, card_amount, iban_amount || 0,
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
        db.prepare('UPDATE income SET is_deleted = 1 WHERE id = ?').run(id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
