/**
 * ValeBook Dashboard Mantığı.
 */

const Dashboard = {
    async init() {
        await this.loadStats();
        await this.loadRecentActivity();
    },

    // Özet verileri yükle
    async loadStats() {
        try {
            const today = await App.fetchAPI('/dashboard/today');
            const month = await App.fetchAPI('/dashboard/month-summary');

            document.getElementById('todayVehicleCount').innerText = today.vehicle_count;
            document.getElementById('todayTotalIncome').innerText = App.formatCurrency(today.total_income);
            document.getElementById('todayTotalExpense').innerText = App.formatCurrency(today.total_expense);
            document.getElementById('monthNetProfit').innerText = App.formatCurrency(month.net_profit);
            
            // Kâr durumuna göre renk ayarla
            const netProfitEl = document.getElementById('monthNetProfit');
            if (month.net_profit < 0) {
                netProfitEl.style.color = 'var(--danger)';
            } else {
                netProfitEl.style.color = 'var(--success)';
            }
        } catch (error) {
            console.error('Stats loading error:', error);
        }
    },

    // Son işlemleri listele
    async loadRecentActivity() {
        try {
            const recent = await App.fetchAPI('/dashboard/recent');
            const tbody = document.querySelector('#recentTransactionsTable tbody');
            
            if (!tbody) return;
            tbody.innerHTML = '';

            recent.forEach(item => {
                const tr = document.createElement('tr');
                const typeLabel = item.type === 'income' ? 'Gelir' : 'Gider';
                const typeClass = item.type === 'income' ? 'text-success' : 'text-danger';
                
                tr.innerHTML = `
                    <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                    <td class="${typeClass}">${typeLabel}</td>
                    <td>${item.description}</td>
                    <td class="${typeClass}">${item.type === 'income' ? '+' : '-'}${App.formatCurrency(item.amount)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('Recent activity error:', error);
        }
    }
};

// Dashboard başlat
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
