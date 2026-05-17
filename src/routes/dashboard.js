const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Dashboard için Birleşik Özet Veri API
 */

// YARDIMCI: İstatistik Hesapla (JS ile aggregasyon)
const calculateStats = (rows, expenses) => {
    let stats = {
        vehicle_count: 0,
        total_income: 0,
        cash_total: 0,
        total_expense: 0
    };

    let totalCashIn = 0;
    let totalIbanIn = 0;
    let totalPosCollectedIn = 0;

    rows.forEach(row => {
        stats.vehicle_count += (row.vehicle_count || 0);
        stats.total_income += (row.total_amount || 0);
        totalCashIn += (row.cash_amount || 0);
        totalIbanIn += (row.iban_amount || 0);
        totalPosCollectedIn += (row.pos_collected_amount || 0);
    });

    expenses.forEach(row => {
        stats.total_expense += (row.amount || 0);
    });

    stats.cash_total = (totalCashIn + totalIbanIn + totalPosCollectedIn) - stats.total_expense;
    return stats;
};

// ANA ROTA: /summary
router.get('/summary', (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'Range required' });

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

        // 1. Verileri Çek
        const rawIncome = db.prepare(`
            SELECT * FROM income 
            WHERE (is_deleted = 0 OR is_deleted IS NULL)
            AND date >= ? AND date <= ?
        `).all(from, to);

        const rawExpense = db.prepare(`
            SELECT * FROM expense 
            WHERE (is_deleted = 0 OR is_deleted IS NULL)
            AND date >= ? AND date <= ?
        `).all(from, to);

        // Karşılaştırma verisi (Bir önceki dönemi kabaca 1 ay öncesi olarak alalım)
        const start = new Date(from);
        const end = new Date(to);
        const diffDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
        
        const prevStart = new Date(start);
        prevStart.setDate(start.getDate() - diffDays);
        const prevEnd = new Date(end);
        prevEnd.setDate(end.getDate() - diffDays);

        const psStr = prevStart.toISOString().split('T')[0];
        const peStr = prevEnd.toISOString().split('T')[0];

        const prevIncome = db.prepare(`
            SELECT * FROM income 
            WHERE (is_deleted = 0 OR is_deleted IS NULL)
            AND date >= ? AND date <= ?
        `).all(psStr, peStr);

        const prevExpense = db.prepare(`
            SELECT * FROM expense 
            WHERE (is_deleted = 0 OR is_deleted IS NULL)
            AND date >= ? AND date <= ?
        `).all(psStr, peStr);

        // 2. İstatistikleri Oluştur
        const currentStats = calculateStats(rawIncome, rawExpense);
        const prevStats = calculateStats(prevIncome, prevExpense);

        // 3. Grafikler
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            days.push(d.toISOString().split('T')[0]);
        }
        // Eğer çok uzun aralık ise (örneğin ay), sadece son 15 günü veya haftalık özeti de dönebilirdik ama şimdilik her günü dönelim.
        const weeklyIncome = days.length <= 40 ? days.map(day => {
            const dayRows = rawIncome.filter(r => r.date === day);
            return {
                date: day,
                cash: dayRows.reduce((sum, r) => sum + (r.cash_amount || 0), 0),
                card: dayRows.reduce((sum, r) => sum + (r.card_amount || 0), 0)
            };
        }) : [];

        const categoryExpenses = rawExpense.reduce((acc, curr) => {
            const existing = acc.find(a => a.category === curr.category);
            if (existing) existing.total += curr.amount;
            else acc.push({ category: curr.category, total: curr.amount });
            return acc;
        }, []).sort((a, b) => b.total - a.total);

        // 4. Son İşlemler (Sadece seçili aralıktaki son 10)
        const recentRows = [
            ...rawIncome.map(r => ({ date: r.date, type: 'income', description: 'Araç Girişi', amount: r.total_amount, ts: r.created_at })),
            ...rawExpense.map(e => ({ date: e.date, type: 'expense', description: `${e.category}: ${e.description}`, amount: e.amount, ts: e.created_at }))
        ].sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 10);

        // 5. Banka / POS Durumu
        const pendingData = db.prepare(`
            SELECT 
                COALESCE(SUM(card_amount), 0) as pending_card,
                COALESCE(SUM(pos_collected_amount), 0) as collected_part
            FROM income 
            WHERE (is_deleted = 0 OR is_deleted IS NULL) AND pos_status != 'collected'
        `).get();

        const commissionSetting = db.prepare('SELECT value FROM settings WHERE key = "pos_commission_rate"').get();
        const rate = commissionSetting ? parseFloat(commissionSetting.value) : 0;
        const pendingNetVal = Math.max(0, (pendingData.pending_card * (1 - rate / 100)) - pendingData.collected_part);

        res.json({
            stats: currentStats,
            comparison: prevStats,
            charts: {
                weeklyIncome,
                categoryExpenses
            },
            recent: recentRows,
            pending_pos: pendingNetVal,
            total_pending_commission: pendingData.pending_card * (rate / 100)
        });

    } catch (error) {
        console.error('[Dashboard Summary Error]:', error);
        res.status(500).json({ error: error.message });
    }
});

// Eski rotalar için API desteği (Arayüz bozulmasın diye 410 yerine basit redirect veya boş dönelim)
router.get('/stats', (req, res) => res.status(200).json({ current: { vehicle_count: 0, cash_total: 0, total_expense: 0 }, comparison: {} })); 
router.get('/charts', (req, res) => res.status(200).json({ weeklyIncome: [], categoryExpenses: [] }));
router.get('/recent', (req, res) => res.status(200).json([]));

module.exports = router;
