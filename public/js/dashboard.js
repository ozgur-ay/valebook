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
            const data = await App.fetchAPI('/dashboard/today');
            const summary = data.summary;
            
            // Sıcak Nakit: Backend'den gelen summary.cash_total (Nakit + Tahsil Edilmiş - Giderler)
            const cashInHand = summary.cash_total;

            document.getElementById('todayVehicleCount').innerText = summary.vehicle_count;
            document.getElementById('cashInHand').innerText = App.formatCurrency(cashInHand);
            document.getElementById('pendingBank').innerText = App.formatCurrency(summary.pending_pos);
            
            // Komisyon notunu güncelle
            const commissionNote = document.getElementById('pendingCommissionNote');
            if (commissionNote && summary.total_pending_commission > 0) {
                commissionNote.innerText = `(${"Kesinti hari\u00e7 net. " + "Tahmini Kesinti: " + App.formatCurrency(summary.total_pending_commission)})`;
            } else if (commissionNote) {
                commissionNote.innerText = "(Kesinti hari\u00e7 net)";
            }

            document.getElementById('todayTotalIncome').innerText = App.formatCurrency(summary.total_income);
            
            // Kasa durumuna göre renk ayarla
            const cashEl = document.getElementById('cashInHand');
            if (cashInHand < 0) {
                cashEl.style.color = 'var(--danger)';
            } else {
                cashEl.style.color = '#10b981'; // Success emerald
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
        const canvas = document.getElementById('incomeTrendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // Premium gradientler
        const cashGrad = ctx.createLinearGradient(0, 0, 0, 320);
        cashGrad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        cashGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
        
        const cardGrad = ctx.createLinearGradient(0, 0, 0, 320);
        cardGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
        cardGrad.addColorStop(1, 'rgba(59, 130, 246, 0)');

        const labels = data.map(item => new Date(item.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }));
        const cashData = data.map(item => item.cash);
        const cardData = data.map(item => item.card);

        if (window.incomeChart) window.incomeChart.destroy();

        window.incomeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Nakit (₺)',
                        data: cashData,
                        borderColor: '#10b981',
                        backgroundColor: cashGrad,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#10b981',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Kart / POS (₺)',
                        data: cardData,
                        borderColor: '#3b82f6',
                        backgroundColor: cardGrad,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#3b82f6',
                        borderWidth: 3,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        align: 'end',
                        labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, usePointStyle: true, padding: 20 }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleFont: { size: 13, weight: '700' },
                        bodyFont: { size: 13 },
                        padding: 12,
                        cornerRadius: 10,
                        displayColors: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
                        ticks: { color: '#64748b', font: { size: 11 }, padding: 10 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 11 }, padding: 10 }
                    }
                }
            }
        });
    },

    renderExpenseChart(data) {
        const canvas = document.getElementById('expenseDistributionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        if (data.length === 0) {
            ctx.font = '14px Inter';
            ctx.fillStyle = '#94a3b8';
            ctx.textAlign = 'center';
            ctx.fillText('Henüz gider verisi yok.', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const labels = data.map(item => item.category);
        const values = data.map(item => item.total);

        if (window.expenseChart) window.expenseChart.destroy();

        window.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                        '#8b5cf6', '#ec4899', '#06b6d4', '#475569'
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 15, usePointStyle: true }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        cornerRadius: 10,
                        padding: 12
                    }
                }
            }
        });
    }
};

// Dashboard başlat
document.addEventListener('DOMContentLoaded', () => Dashboard.init());
