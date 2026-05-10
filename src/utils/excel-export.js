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

    // --- Gelir Sayfası ---
    const incomeSheet = workbook.addWorksheet('Gelirler');
    incomeSheet.columns = [
        { header: 'Tarih', key: 'date', width: 15 },
        { header: 'Araç Sayısı', key: 'vehicle_count', width: 12 },
        { header: 'Birim Ücret', key: 'unit_fee', width: 12 },
        { header: 'Toplam Tutar', key: 'total_amount', width: 15 },
        { header: 'Nakit', key: 'cash_amount', width: 12 },
        { header: 'Kart (POS)', key: 'card_amount', width: 12 },
        { header: 'Ödeme Yöntemi', key: 'payment_method', width: 15 },
        { header: 'Not', key: 'note', width: 30 }
    ];
    incomeSheet.addRows(incomeData);

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
    expenseSheet.addRows(expenseData);

    // Stil özellikleri ekle
    [incomeSheet, expenseSheet].forEach(sheet => {
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    });

    return workbook;
}

module.exports = { exportToExcel };
