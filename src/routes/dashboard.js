const express = require('express');
const router = express.Router();
const db = require('../database');

/**
 * Dashboard için özet veri API rotaları.
 */

// Bugünün özeti (Araç sayısı, toplam gelir, toplam gider)
router.get('/today', (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Gelir özeti
        const income = db.prepare(`
            SELECT 
                SUM(vehicle_count) as total_vehicles,
                SUM(total_amount) as total_income
            FROM income 
            WHERE date = ?
        `).get(today);

        // Gider özeti
        const expense = db.prepare(`
            SELECT SUM(amount) as total_expense
            FROM expense
            WHERE date = ?
        `).get(today);

        res.json({
            date: today,
            vehicle_count: income.total_vehicles || 0,
            total_income: income.total_income || 0,
            total_expense: expense.total_expense || 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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

module.exports = router;
