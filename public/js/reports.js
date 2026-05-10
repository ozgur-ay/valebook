/**
 * ValeBook Raporlama Mantığı.
 */

const Reports = {
    init() {
        this.setDefaultDates();
    },

    setDefaultDates() {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        document.getElementById('fromDate').value = firstDay.toISOString().split('T')[0];
        document.getElementById('toDate').value = now.toISOString().split('T')[0];
    },

    async loadSummary() {
        const from = document.getElementById('fromDate').value;
        const to = document.getElementById('toDate').value;

        try {
            const data = await App.fetchAPI(`/reports/summary?from=${from}&to=${to}`);
            
            document.getElementById('reportResults').style.display = 'block';
            document.getElementById('reportIncome').innerText = App.formatCurrency(data.summary.total_income);
            document.getElementById('reportExpense').innerText = App.formatCurrency(data.summary.total_expense);
            document.getElementById('reportNetStatus').innerText = App.formatCurrency(data.summary.net_profit);
            
            document.getElementById('paymentSplit').innerText = `Nakit: ${App.formatCurrency(data.summary.total_cash)} | POS: ${App.formatCurrency(data.summary.total_card)} | Kesinti: ${App.formatCurrency(data.summary.total_commission)}`;
            
            const netEl = document.getElementById('reportNetStatus');
            netEl.style.color = data.summary.net_profit < 0 ? 'var(--danger)' : '#10b981';

            // Gider tablosu (Özet)
            const tbodySummary = document.querySelector('#expenseSummaryTable tbody');
            tbodySummary.innerHTML = '';
            data.expense_details.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.category}</td>
                    <td>${App.formatCurrency(item.total_amount)}</td>
                `;
                tbodySummary.appendChild(tr);
            });

            // Gelir tablosu (Detaylı)
            const tbodyIncome = document.querySelector('#rawIncomeTable tbody');
            tbodyIncome.innerHTML = '';
            data.raw_income.forEach(item => {
                const tr = document.createElement('tr');
                const rate = data.pos_rate || 0;
                const commission = (item.card_amount || 0) * (rate / 100);
                const net = (item.total_amount || 0) - commission;
                
                tr.innerHTML = `
                    <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                    <td>${item.vehicle_count} Ara\u00e7</td>
                    <td>${App.formatCurrency(item.total_amount)}</td>
                    <td class="text-danger">${App.formatCurrency(commission)}</td>
                    <td class="text-success">${App.formatCurrency(net)}</td>
                    <td>${App.formatCurrency(item.cash_amount)}</td>
                    <td>${App.formatCurrency(item.card_amount)}</td>
                    <td>${item.note || '-'}</td>
                `;
                tbodyIncome.appendChild(tr);
            });

            // Gider tablosu (Detaylı)
            const tbodyRaw = document.querySelector('#rawExpenseTable tbody');
            tbodyRaw.innerHTML = '';
            data.raw_expenses.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                    <td>${item.category}</td>
                    <td>${item.description || '-'}</td>
                    <td class="text-danger">-${App.formatCurrency(item.amount)}</td>
                    <td>${item.payment_method === 'cash' ? 'Nakit' : 'Kredi Kart\u0131'}</td>
                    <td>${item.document_no || '-'}</td>
                `;
                tbodyRaw.appendChild(tr);
            });

        } catch (error) {
            alert('Rapor yüklenirken hata oluştu.');
        }
    },

    exportExcel() {
        const from = document.getElementById('fromDate').value;
        const to = document.getElementById('toDate').value;
        window.location.href = `/api/reports/export-excel?from=${from}&to=${to}`;
    }
};

document.addEventListener('DOMContentLoaded', () => Reports.init());
