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
        console.log(`[Dashboard Stats] Requested Range: ${from} to ${to}`);
        
        if (!from || !to) return res.status(400).json({ error: 'Date range required' });

        const getStats = (f, t) => {
            // Transaction date bazlı gelirler
            const income = db.prepare(`
                SELECT 
                    COALESCE(SUM(vehicle_count), 0) as total_vehicles,
                    COALESCE(SUM(total_amount), 0) as total_income,
                    COALESCE(SUM(cash_amount), 0) as total_cash,
                    COALESCE(SUM(iban_amount), 0) as total_iban
                FROM income 
                WHERE date(date) BETWEEN date(?) AND date(?) 
                AND (is_deleted = 0 OR is_deleted IS NULL)
            `).get(f, t);

            // Giderler
            const expense = db.prepare(`
                SELECT COALESCE(SUM(amount), 0) as total FROM expense 
                WHERE date(date) BETWEEN date(?) AND date(?) 
                AND (is_deleted = 0 OR is_deleted IS NULL)
            `).get(f, t);

            // Bu aralıkta bankadan tahsil edilen POS tutarları
            const posCollectedQueryResult = db.prepare(`
                SELECT COALESCE(SUM(pos_collected_amount), 0) as total 
                FROM income 
                WHERE (is_deleted = 0 OR is_deleted IS NULL)
                AND date(pos_collected_date) BETWEEN date(?) AND date(?)
            `).get(f, t);
            
            const totalCashIn = income.total_cash;
            const totalIbanIn = income.total_iban;
            const totalPosCollectedIn = posCollectedQueryResult.total;
            const totalExp = expense.total;

            return {
                vehicle_count: income.total_vehicles,
                total_income: income.total_income,
                cash_total: (totalCashIn + totalIbanIn + totalPosCollectedIn) - totalExp,
                total_expense: totalExp
            };
        };

        const current = getStats(from, to);
        
        // AI DEBUG: Write result to a file we can read
        try {
            const fs = require('fs');
            const path = require('path');
            const debugPath = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share'), 'ValeBook', 'debug_stats.json');
            
            const incomeDebug = db.prepare('SELECT id, date, total_amount, is_deleted FROM income LIMIT 10').all();
            const expenseDebug = db.prepare('SELECT id, date, amount, is_deleted FROM expense LIMIT 10').all();
            const matchedIncome = db.prepare('SELECT COUNT(*) as count FROM income WHERE date(date) BETWEEN date(?) AND date(?)').get(from, to);
            
            fs.writeFileSync(debugPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                from, to,
                current,
                incomeCount: db.prepare('SELECT COUNT(*) as count FROM income').get(),
                matchedIncome,
                incomeDebug,
                expenseDebug
            }, null, 2));
        } catch (e) {}

        console.log(`[Dashboard Stats Debug] Range: ${from} -> ${to}`);
        console.table(current);

        
        let comparison = { vehicle_count: 0, total_income: 0, cash_total: 0, total_expense: 0 };

        if (compareFrom && compareTo) {
            comparison = getStats(compareFrom, compareTo);
        }

        const pendingData = db.prepare(`
            SELECT 
                COALESCE(SUM(card_amount), 0) as pending_card,
                COALESCE(SUM(pos_collected_amount), 0) as collected_part
            FROM income 
            WHERE is_deleted = 0 AND pos_status != 'collected'
        `).get();

        const commissionSetting = db.prepare('SELECT value FROM settings WHERE key = "pos_commission_rate"').get();
        const rate = commissionSetting ? parseFloat(commissionSetting.value) : 0;
        
        const pendingNetVal = (pendingData.pending_card * (1 - rate / 100)) - pendingData.collected_part;

        res.json({
            current,
            comparison,
            pending_pos: Math.max(0, pendingNetVal),
            total_pending_commission: (pendingData.pending_card * (rate / 100)),
            pos_rate: rate
        });
    } catch (error) {
        console.error('[Dashboard Stats Error]:', error);
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
            WHERE (is_deleted = 0 OR is_deleted IS NULL)
            ORDER BY date DESC, created_at DESC
            LIMIT 5
        `).all();

        const expenses = db.prepare(`
            SELECT date, 'expense' as type, category || ': ' || description as description, amount, created_at
            FROM expense
            WHERE (is_deleted = 0 OR is_deleted IS NULL)
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

// DIAGNOSTIC ROUTE
router.get('/debug', (req, res) => {
    try {
        const incomeCount = db.prepare('SELECT COUNT(*) as count FROM income').get();
        const deletedIncome = db.prepare('SELECT COUNT(*) as count FROM income WHERE is_deleted = 1').get();
        const liveIncome = db.prepare('SELECT COUNT(*) as count FROM income WHERE is_deleted = 0').get();
        const sampleIncome = db.prepare('SELECT id, date, total_amount, is_deleted FROM income ORDER BY id DESC LIMIT 5').all();
        
        res.json({
            incomeCount,
            deletedIncome,
            liveIncome,
            sampleIncome,
            dbPath: db.name || 'unknown'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Grafik Verileri (Haftalık gelir ve Kategori dağılımı)
router.get('/charts', (req, res) => {
    try {
        const { from, to } = req.query; // Artık range alıyoruz!
        
        // 1. Son 7 günün tarihlerini belirle (Eğer from/to yoksa varsayılan son 7 gün)
        const days = [];
        const endDate = to ? new Date(to) : new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(endDate);
            d.setDate(d.getDate() - i);
            days.push(d.toISOString().split('T')[0]);
        }

        const statsFrom = from || days[0];
        const statsTo = to || days[6];

        // 2. Veritabanından mevcut verileri çek (Silinmemişler!)
        const rawIncome = db.prepare(`
            SELECT 
                date, 
                SUM(cash_amount) as cash, 
                SUM(card_amount) as card 
            FROM income 
            WHERE date(date) BETWEEN date(?) AND date(?) AND is_deleted = 0
            GROUP BY date
        `).all(statsFrom, statsTo);

        // 3. Tarih dizisini baz alarak eksik günleri 0 ile doldur
        const weeklyIncome = days.map(date => {
            const found = rawIncome.find(r => r.date === date);
            return {
                date,
                cash: found ? found.cash : 0,
                card: found ? found.card : 0
            };
        });

        // 4. Giderlerin kategorilere göre dağılımı (Sadece seçili aralıktakiler ve silinmemişler!)
        const categoryExpenses = db.prepare(`
            SELECT 
                category, 
                SUM(amount) as total 
            FROM expense 
            WHERE date(date) BETWEEN date(?) AND date(?) AND is_deleted = 0
            GROUP BY category
            ORDER BY total DESC
        `).all(statsFrom, statsTo);

        res.json({
            weeklyIncome,
            categoryExpenses
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
