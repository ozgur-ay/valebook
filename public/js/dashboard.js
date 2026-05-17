const Dashboard = {
    currentRange: 'daily',

    async init() {
        this.setupFilters();
        await this.loadAll();
    },

    async loadAll() {
        const range = this.getRangeDates(this.currentRange);
        await this.loadStats(range);
        await this.loadRecentActivity();
        await this.initCharts();
    },

    setupFilters() {
        const buttons = document.querySelectorAll('#timeRangeFilter button');
        buttons.forEach(btn => {
            btn.onclick = async () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentRange = btn.dataset.range;
                this.updateLabels();
                await this.loadAll();
            };
        });
        this.updateLabels();
    },

    updateLabels() {
        const labels = {
            daily: { v: 'Bugünkü Araç', c: 'Sıcak Nakit (Kasa)', e: 'Bugünkü Gider' },
            weekly: { v: 'Haftalık Araç', c: 'Haftalık Kasa', e: 'Haftalık Gider' },
            monthly: { v: 'Aylık Araç', c: 'Aylık Kasa', e: 'Aylık Gider' }
        };
        const active = labels[this.currentRange];
        document.getElementById('vehicleLabel').innerText = active.v;
        document.getElementById('cashLabel').innerText = active.c;
        document.getElementById('expenseLabel').innerText = active.e;
    },

    getRangeDates(range) {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        let from, to = today;
        let cFrom, cTo;

        if (range === 'daily') {
            from = today;
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            cFrom = cTo = yesterday.toISOString().split('T')[0];
        } else if (range === 'weekly') {
            // Pazartesi başlangıç
            const day = now.getDay(); // 0 (Paz) - 6 (Cmt)
            const diff = now.getDate() - (day === 0 ? 6 : day - 1);
            const monday = new Date(now.setDate(diff));
            from = monday.toISOString().split('T')[0];
            
            // Karşılaştırma: Geçen haftanın aynı günleri
            const lastMon = new Date(monday);
            lastMon.setDate(monday.getDate() - 7);
            const lastSameDay = new Date(new Date().setDate(new Date().getDate() - 7));
            cFrom = lastMon.toISOString().split('T')[0];
            cTo = lastSameDay.toISOString().split('T')[0];
        } else if (range === 'monthly') {
            from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            
            // Karşılaştırma: Geçen ayın 1'inden geçen ayın aynı gününe
            const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1));
            cFrom = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-01`;
            const lastMonthSameDay = new Date(new Date().setMonth(new Date().getMonth() - 1));
            cTo = lastMonthSameDay.toISOString().split('T')[0];
        }

        // Seçili aralık etiketini güncelle
        const fmt = (d) => new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        document.getElementById('selectedRangeLabel').innerText = `${fmt(from)} - ${fmt(to)} Aralığı Gösteriliyor`;

        return { from, to, compareFrom: cFrom, compareTo: cTo };
    },

    async loadStats(range) {
        try {
            const url = `/dashboard/stats?from=${range.from}&to=${range.to}&compareFrom=${range.compareFrom}&compareTo=${range.compareTo}`;
            const data = await App.fetchAPI(url);
            
            const cur = data.current;
            const prev = data.comparison;

            // Değerleri bas
            document.getElementById('todayVehicleCount').innerText = cur.vehicle_count;
            document.getElementById('cashInHand').innerText = App.formatCurrency(cur.cash_total);
            document.getElementById('todayTotalExpense').innerText = App.formatCurrency(cur.total_expense);
            document.getElementById('pendingBank').innerText = App.formatCurrency(data.pending_pos);

            // Trendleri hesapla ve göster
            this.renderTrend('trendVehicle', cur.vehicle_count, prev.vehicle_count);
            this.renderTrend('trendCash', cur.cash_total, prev.cash_total);
            this.renderTrend('trendExpense', cur.total_expense, prev.total_expense, true); // Gider artışı kötüdür

            // Banka notu
            const n = document.getElementById('pendingCommissionNote');
            if (n) n.innerText = `(Tahmini Kesinti: ${App.formatCurrency(data.total_pending_commission)})`;

            // Kasa renk
            document.getElementById('cashInHand').style.color = cur.cash_total < 0 ? 'var(--danger)' : '#10b981';

        } catch (error) {
            console.error('Stats error:', error);
        }
    },

    renderTrend(elementId, current, previous, inverse = false) {
        const el = document.getElementById(elementId);
        if (!el) return;

        if (!previous || previous === 0) {
            el.style.display = 'none';
            return;
        }

        const diff = current - previous;
        const percent = Math.abs(Math.round((diff / previous) * 100));
        
        el.style.display = 'inline-block';
        el.innerText = `%${percent}`;
        el.className = 'trend-badge';

        if (diff === 0) {
            el.style.display = 'none';
            return;
        }

        const isPositive = diff > 0;
        const arrowClass = isPositive ? 'inc' : 'dec';
        // inverse (Gider) ise: Artış (isPositive) Kırmızı (minus), Azalış Yeşil (plus)
        // Normal (Gelir) ise: Artış Yeşil (plus), Azalış Kırmızı (minus)
        const colorClass = inverse ? (isPositive ? 'minus' : 'plus') : (isPositive ? 'plus' : 'minus');
        
        el.classList.add(arrowClass, colorClass);
    },

    async loadRecentActivity() {
        try {
            const recent = await App.fetchAPI('/dashboard/recent');
            const tbody = document.querySelector('#recentTransactionsTable tbody');
            if (!tbody) return;
            tbody.innerHTML = '';

            recent.forEach(item => {
                const tr = document.createElement('tr');
                const isInc = item.type === 'income';
                tr.innerHTML = `
                    <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                    <td class="${isInc ? 'text-success' : 'text-danger'}">${isInc ? 'Gelir' : 'Gider'}</td>
                    <td>${item.description}</td>
                    <td class="${isInc ? 'text-success' : 'text-danger'}">${isInc ? '+' : '-'}${App.formatCurrency(item.amount)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {}
    },

    async initCharts() {
        try {
            const data = await App.fetchAPI('/dashboard/charts');
            this.renderIncomeChart(data.weeklyIncome);
            this.renderExpenseChart(data.categoryExpenses);
        } catch (e) {}
    },

    renderIncomeChart(data) {
        const canvas = document.getElementById('incomeTrendChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
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
                        backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                        fill: true, 
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        borderWidth: 3
                    },
                    { 
                        label: 'Kart (₺)', 
                        data: cardData, 
                        borderColor: '#3b82f6', 
                        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
                        fill: true, 
                        tension: 0.4,
                        pointRadius: 2,
                        pointHoverRadius: 6,
                        borderWidth: 3
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
                        labels: { boxWidth: 8, usePointStyle: true, pointStyle: 'circle', font: { size: 11, weight: '600' }, color: '#94a3b8' }
                    }
                },
                scales: { 
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#64748b', font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } }
                } 
            }
        });
    },

    renderExpenseChart(data) {
        const canvas = document.getElementById('expenseDistributionChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (window.expenseChart) window.expenseChart.destroy();

        window.expenseChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: data.map(i => i.category),
                datasets: [{ 
                    data: data.map(i => i.total), 
                    backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                cutout: '78%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 8, usePointStyle: true, padding: 20, font: { size: 11 }, color: '#94a3b8' }
                    }
                }
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => Dashboard.init());
