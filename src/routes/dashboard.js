const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Dashboard için özet veri API rotaları.
 */

// Bugünün özeti (Araç sayısı, toplam gelir, toplam gider)
// Dinamik İstatistik Rotası (Tarih Aralıklı + Karşılaştırmalı)
router.get('/stats', (req, res) => {
    try {
        const { from, to, compareFrom, compareTo } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'Date range required' });

        const getStats = (f, t) => {
            const income = db.prepare(`
                SELECT 
                    SUM(vehicle_count) as total_vehicles,
                    SUM(cash_amount) as total_cash,
                    SUM(card_amount) as total_card,
                    SUM(iban_amount) as total_iban,
                    SUM(total_amount) as total_income
                FROM income 
                WHERE date BETWEEN ? AND ? AND is_deleted = 0
            `).get(f, t) || {};

            const expense = db.prepare(`
                SELECT SUM(amount) as total FROM expense 
                WHERE date BETWEEN ? AND ? AND is_deleted = 0
            `).get(f, t) || {};

            // Harcanabilir (Sıcak Kasa): (Nakit + IBAN + Tahsil Edilmiş POS) - Giderler
            const totalCashIncome = income.total_cash || 0;
            const totalIbanIncome = income.total_iban || 0;
            const totalPosCollected = db.prepare('SELECT SUM(pos_collected_amount) as total FROM income WHERE is_deleted = 0 AND pos_collected_date BETWEEN ? AND ?').get(f, t).total || 0;
            const totalExpenses = expense.total || 0;

            return {
                vehicle_count: income.total_vehicles || 0,
                total_income: income.total_income || 0,
                cash_total: (totalCashIncome + totalIbanIncome + totalPosCollected) - totalExpenses,
                total_expense: totalExpenses
            };
        };

        const current = getStats(from, to);
        let comparison = null;

        if (compareFrom && compareTo) {
            comparison = getStats(compareFrom, compareTo);
        }

        // Bankada Bekleyen Mevcut Durum (Aralıktan Bağımsız, Anlık)
        const commissionSetting = db.prepare('SELECT value FROM settings WHERE key = "pos_commission_rate"').get();
        const rate = commissionSetting ? parseFloat(commissionSetting.value) : 0;
        const pendingCardTotal = db.prepare("SELECT SUM(card_amount) as total FROM income WHERE is_deleted = 0 AND pos_status != 'collected'").get().total || 0;
        const pendingCollectedPart = db.prepare("SELECT SUM(pos_collected_amount) as total FROM income WHERE is_deleted = 0 AND pos_status != 'collected'").get().total || 0;
        const pendingNetVal = (pendingCardTotal * (1 - rate / 100)) - pendingCollectedPart;

        res.json({
            current,
            comparison,
            pending_pos: Math.max(0, pendingNetVal),
            total_pending_commission: (pendingCardTotal * (rate / 100)),
            pos_rate: rate
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Eski /today rotasını geriye uyumluluk için koruyoruz
router.get('/today', (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    res.redirect(`/api/dashboard/stats?from=${today}&to=${today}`);
});

// Bu ayın özeti ve Net Kâr
router.get('/month-summary', (req, res) => {
    try {
        const now = new Date();
        const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        
        const income = db.prepare(`
            SELECT SUM(total_amount) as total_income
            FROM income
            WHERE date >= ?
        `).get(startOfMonth);

        const expense = db.prepare(`
            SELECT SUM(amount) as total_expense
            FROM expense
            WHERE date >= ?
        `).get(startOfMonth);

        const totalIncome = income.total_income || 0;
        const totalExpense = expense.total_expense || 0;

        res.json({
            total_income: totalIncome,
            total_expense: totalExpense,
            net_profit: totalIncome - totalExpense
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Son 10 işlem
router.get('/recent', (req, res) => {
    try {
        const income = db.prepare(`
            SELECT date, 'income' as type, 'Araç Girişi' as description, total_amount as amount, created_at
            FROM income
            ORDER BY date DESC, created_at DESC
            LIMIT 5
        `).all();

        const expenses = db.prepare(`
            SELECT date, 'expense' as type, category || ': ' || description as description, amount, created_at
            FROM expense
            ORDER BY date DESC, created_at DESC
            LIMIT 5
        `).all();

        const combined = [...income, ...expenses]
            .sort((a, b) => {
                if (a.date !== b.date) return b.date.localeCompare(a.date);
                return b.created_at.localeCompare(a.created_at);
            })
            .slice(0, 10);

        res.json(combined);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Grafik Verileri (Haftalık gelir ve Kategori dağılımı)
router.get('/charts', (req, res) => {
    try {
        // 1. Son 7 günün tarihlerini belirle (Eksik günleri 0 ile doldurmak için)
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }

        // 2. Veritabanından mevcut verileri çek
        const rawIncome = db.prepare(`
            SELECT 
                date, 
                SUM(cash_amount) as cash, 
                SUM(card_amount) as card 
            FROM income 
            WHERE date >= ?
            GROUP BY date
        `).all(days[0]);

        // 3. Tarih dizisini baz alarak eksik günleri 0 ile doldur (Trendin sürekliliği için)
        const weeklyIncome = days.map(date => {
            const found = rawIncome.find(r => r.date === date);
            return {
                date,
                cash: found ? found.cash : 0,
                card: found ? found.card : 0
            };
        });

        // 4. Giderlerin kategorilere göre dağılımı
        const categoryExpenses = db.prepare(`
            SELECT 
                category, 
                SUM(amount) as total 
            FROM expense 
            GROUP BY category
            ORDER BY total DESC
        `).all();

        res.json({
            weeklyIncome,
            categoryExpenses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
