const ExcelJS = require('exceljs');
const path = require('path');

/**
 * Verileri Excel formatında dışa aktaran yardımcı modül.
 */

async function exportToExcel(incomeData, expenseData, fileName = 'ValeBook_Rapor.xlsx') {
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

    const processedIncomeData = incomeData.map(row => ({
        ...row,
        payment_method: mapPaymentMethod(row.payment_method)
    }));

    const processedExpenseData = expenseData.map(row => ({
        ...row,
        payment_method: mapPaymentMethod(row.payment_method)
    }));

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
