const express = require('express');
const router = express.Router();
const db = require('../database');
const { exportToExcel } = require('../utils/excel-export');

/**
 * Raporlama ve Excel export API rotaları.
 */

// Rapor özeti getir (Gelir vs Gider)
router.get('/summary', (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'Date range required' });

        const incomeResult = db.prepare(`
            SELECT 
                SUM(vehicle_count) as total_vehicles,
                SUM(total_amount) as total_income,
                SUM(cash_amount) as total_cash,
                SUM(card_amount) as total_card
            FROM income
            WHERE date BETWEEN ? AND ?
        `).get(from, to) || {};

        const expense = db.prepare(`
            SELECT 
                category,
                SUM(amount) as total_amount
            FROM expense
            WHERE date BETWEEN ? AND ?
            GROUP BY category
        `).all(from, to) || [];

        const rawExpenses = db.prepare(`
            SELECT * FROM expense
            WHERE date BETWEEN ? AND ? AND is_deleted = 0
            ORDER BY date DESC
        `).all(from, to) || [];

        const rawIncome = db.prepare(`
            SELECT * FROM income
            WHERE date BETWEEN ? AND ? AND is_deleted = 0
            ORDER BY date DESC
        `).all(from, to) || [];

        const commissionSetting = db.prepare('SELECT value FROM settings WHERE key = "pos_commission_rate"').get();
        const rate = commissionSetting ? (parseFloat(commissionSetting.value) || 0) : 0;
        
        const totalCommission = (incomeResult.total_card || 0) * (rate / 100);
        const totalExpense = expense.reduce((sum, item) => sum + (item.total_amount || 0), 0);
        const netProfitAfterCommission = (incomeResult.total_income || 0) - totalExpense - totalCommission;

        res.json({
            summary: {
                total_vehicles: incomeResult.total_vehicles || 0,
                total_income: incomeResult.total_income || 0,
                total_cash: incomeResult.total_cash || 0,
                total_card: incomeResult.total_card || 0,
                total_commission: totalCommission,
                total_expense: totalExpense,
                net_profit: netProfitAfterCommission
            },
            expense_details: expense,
            raw_expenses: rawExpenses,
            raw_income: rawIncome,
            pos_rate: rate
        });
    } catch (error) {
        require('../utils/logger.js').error('REPORTS GET ERROR', {}, error);
        res.status(500).json({ error: error.message });
    }
});

// Excel dışa aktar
router.get('/export-excel', async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'Date range required' });

        const incomeData = db.prepare('SELECT * FROM income WHERE date BETWEEN ? AND ? ORDER BY date').all(from, to);
        const expenseData = db.prepare('SELECT * FROM expense WHERE date BETWEEN ? AND ? ORDER BY date').all(from, to);

        const commissionSetting = db.prepare('SELECT value FROM settings WHERE key = "pos_commission_rate"').get();
        const rate = commissionSetting ? parseFloat(commissionSetting.value) : 0;

        const workbook = await exportToExcel(incomeData, expenseData, { posRate: rate });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=ValeBook_Rapor_${from}_${to}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        require('../utils/logger.js').error('EXCEL EXPORT ERROR', {}, error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
