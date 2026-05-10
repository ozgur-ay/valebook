const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Verileri Excel formatında dışa aktaran yardımcı modül.
 */

async function exportToExcel(incomeData, expenseData, options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ValeBook';
    workbook.lastModifiedBy = 'ValeBook';
    workbook.created = new Date();

    // Verileri işle (Dil yerelleştirme)
    const mapPaymentMethod = (method) => {
        const mapping = {
            'cash': 'Nakit',
            'credit_card': 'Kredi Kartı',
            'mixed': 'Karışık'
        };
        return mapping[method] || method;
    };

    const processedIncomeData = incomeData.map(row => {
        const rate = options.posRate || 0;
        const commission = row.payment_method === 'cash' ? 0 : (row.card_amount || 0) * (rate / 100);
        return {
            ...row,
            payment_method: mapPaymentMethod(row.payment_method),
            commission: commission,
            net_amount: (row.total_amount || 0) - commission
        };
    });

    const processedExpenseData = expenseData.map(row => ({
        ...row,
        payment_method: mapPaymentMethod(row.payment_method)
    }));

    // --- Gelir Sayfası ---
    const incomeSheet = workbook.addWorksheet('Gelirler');
    incomeSheet.columns = [
        { header: 'Tarih', key: 'date', width: 15 },
        { header: 'Araç Sayısı', key: 'vehicle_count', width: 12 },
        { header: 'Toplam (Brüt)', key: 'total_amount', width: 15 },
        { header: 'Banka Kesintisi', key: 'commission', width: 15 },
        { header: 'Net Tutar', key: 'net_amount', width: 15 },
        { header: 'Nakit', key: 'cash_amount', width: 12 },
        { header: 'Kart (POS)', key: 'card_amount', width: 12 },
        { header: 'Ödeme Yöntemi', key: 'payment_method', width: 15 },
        { header: 'Not', key: 'note', width: 30 }
    ];
    incomeSheet.addRows(processedIncomeData);

    // --- Gider Sayfası ---
    const expenseSheet = workbook.addWorksheet('Giderler');
    expenseSheet.columns = [
        { header: 'Tarih', key: 'date', width: 15 },
        { header: 'Kategori', key: 'category', width: 20 },
        { header: 'Açıklama', key: 'description', width: 30 },
        { header: 'Tutar', key: 'amount', width: 15 },
        { header: 'Ödeme Yöntemi', key: 'payment_method', width: 15 },
        { header: 'Belge No', key: 'document_no', width: 15 },
        { header: 'Not', key: 'note', width: 30 }
    ];
    expenseSheet.addRows(processedExpenseData);

    // Stil özellikleri ekle
    [incomeSheet, expenseSheet].forEach(sheet => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    return workbook;
}

module.exports = { exportToExcel };
