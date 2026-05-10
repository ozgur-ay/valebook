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
            
            document.getElementById('paymentSplit').innerText = `Nakit: ${App.formatCurrency(data.summary.total_cash)} | POS: ${App.formatCurrency(data.summary.total_card)}`;
            
            const netEl = document.getElementById('reportNetStatus');
            netEl.style.color = data.summary.net_profit < 0 ? 'var(--danger)' : 'var(--success)';

            // Gider tablosu
            const tbody = document.querySelector('#expenseSummaryTable tbody');
            tbody.innerHTML = '';
            data.expense_details.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.category}</td>
                    <td>${App.formatCurrency(item.total_amount)}</td>
                `;
                tbody.appendChild(tr);
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
