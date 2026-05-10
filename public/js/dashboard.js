/**
 * ValeBook Dashboard Mantığı.
 */

const Dashboard = {
    async init() {
        await this.loadStats();
        await this.loadRecentActivity();
        await this.initCharts();
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
    },

    // Grafiklerin başlatılması ve verilerin yüklenmesi
    async initCharts() {
        try {
            const data = await App.fetchAPI('/dashboard/charts');
            
            this.renderIncomeChart(data.weeklyIncome);
            this.renderExpenseChart(data.categoryExpenses);
        } catch (error) {
            console.error('Chart loading error:', error);
        }
    },

    renderIncomeChart(data) {
        const ctx = document.getElementById('incomeTrendChart').getContext('2d');
        
        // Verileri Chart.js formatına hazırla
        const labels = data.map(item => new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
        const cashData = data.map(item => item.cash);
        const cardData = data.map(item => item.card);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nakit (₺)',
                        data: cashData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Kart (₺)',
                        data: cardData,
                        borderColor: '#2563eb',
                        backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#94a3b8', font: { family: 'Inter' } }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(51, 65, 85, 0.5)' },
                        ticks: { color: '#94a3b8' }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8' }
                    }
                },
                animation: {
                    duration: 2000,
                    easing: 'easeOutQuart'
                }
            }
        });
    },

    renderExpenseChart(data) {
        const ctx = document.getElementById('expenseDistributionChart').getContext('2d');
        
        if (data.length === 0) {
            ctx.font = '14px Inter';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('Henüz gider verisi yok.', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const labels = data.map(item => item.category);
        const values = data.map(item => item.total);

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#2563eb', '#10b981', '#f59e0b', '#ef4444', 
                        '#8b5cf6', '#ec4899', '#06b6d4', '#475569'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#94a3b8', font: { family: 'Inter' }, padding: 20 }
                    }
                },
                animation: {
                    animateRotate: true,
                    animateScale: true,
                    duration: 2000
                }
            }
        });
    }
};

// Dashboard başlat
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
