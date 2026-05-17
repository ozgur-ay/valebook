const Dashboard = {
    currentRange: 'monthly',

    async init() {
        this.setupFilters();
        await this.loadAll();
    },

    async loadAll() {
        try {
            const range = this.getRangeDates(this.currentRange);
            const url = `/dashboard/summary?from=${range.from}&to=${range.to}`;
            const data = await App.fetchAPI(url);
            console.log('[Dashboard Summary]:', data);

            if (!data || !data.stats) throw new Error('Invalid data format');

            // 1. Stats
            this.renderStats(data.stats, data.comparison, data.pending_pos, data.total_pending_commission);

            // 2. Charts
            if (data.charts) {
                this.renderIncomeChart(data.charts.weeklyIncome || []);
                this.renderExpenseChart(data.charts.categoryExpenses || []);
            }

            // 3. Transactions
            this.renderRecentActivity(data.recent || []);

            // Hide error if any
            const errDiv = document.getElementById('dashboardError');
            if (errDiv) errDiv.style.display = 'none';

        } catch (error) {
            console.error('Dashboard Load Error:', error);
            const container = document.querySelector('.dashboard-overview');
            if (container) {
                let errDiv = document.getElementById('dashboardError');
                if (!errDiv) {
                    errDiv = document.createElement('div');
                    errDiv.id = 'dashboardError';
                    errDiv.style = 'background: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; padding: 1rem; color: #ef4444; margin-bottom: 2rem; border-radius: 4px;';
                    container.prepend(errDiv);
                }
                errDiv.innerHTML = `<strong>Sistem Hatası:</strong> Dashboard verileri yüklenemedi. <br><small>${error.message}</small>`;
                errDiv.style.display = 'block';
            }
        }
    },

    setupFilters() {
        const buttons = document.querySelectorAll('#timeRangeFilter button');
        const customArea = document.getElementById('customDateArea');

        buttons.forEach(btn => {
            btn.onclick = async () => {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentRange = btn.dataset.range;
                
                if (this.currentRange === 'custom') {
                    customArea.style.display = 'flex';
                } else {
                    customArea.style.display = 'none';
                    this.updateLabels();
                    await this.loadAll();
                }
            };
        });

        document.getElementById('btnApplyCustom').onclick = async () => {
            const from = document.getElementById('customFrom').value;
            const to = document.getElementById('customTo').value;

            if (!from || !to) {
                App.showToast('Lütfen her iki tarihi de seçiniz.', 'warning');
                return;
            }

            const btn = document.getElementById('btnApplyCustom');
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = 'Yükleniyor...';

            try {
                this.updateLabels();
                await this.loadAll();
                App.showToast('Veriler yenilendi.', 'success');
            } catch (err) {
                App.showToast('Veri yüklenirken hata oluştu.', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        };

        this.updateLabels();
    },

    updateLabels() {
        const labels = {
            daily: { v: 'Bugünkü Araç', c: 'Sıcak Nakit (Kasa)', e: 'Bugünkü Gider' },
            weekly: { v: 'Haftalık Araç', c: 'Haftalık Kasa', e: 'Haftalık Gider' },
            monthly: { v: 'Aylık Araç', c: 'Aylık Kasa', e: 'Aylık Gider' },
            custom: { v: 'Seçili Aralıktaki Araç', c: 'Seçili Aralıktaki Kasa', e: 'Seçili Aralıktaki Gider' }
        };
        const active = labels[this.currentRange] || labels.monthly;
        document.getElementById('vehicleLabel').innerText = active.v;
        document.getElementById('cashLabel').innerText = active.c;
        document.getElementById('expenseLabel').innerText = active.e;
    },

    getRangeDates(range) {
        const now = new Date();
        // Zaman dilimi kaymasını önlemek için yerel formatlama yardımcısı
        const toLocalISO = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        const today = toLocalISO(now);
        let from = today;
        let to = today;
        let cFrom, cTo;

        if (range === 'daily') {
            from = today;
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            cFrom = cTo = toLocalISO(yesterday);
        } else if (range === 'weekly') {
            // Pazartesi'den başla (Monday = 1, Sunday = 0)
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1;
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            
            from = toLocalISO(monday);
            to = today;
            
            const lastMon = new Date(monday);
            lastMon.setDate(monday.getDate() - 7);
            const lastSameDay = new Date(now);
            lastSameDay.setDate(now.getDate() - 7);
            cFrom = toLocalISO(lastMon);
            cTo = toLocalISO(lastSameDay);
        } else if (range === 'monthly') {
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            from = toLocalISO(firstDay);
            to = today;
            
            const lastMonthFirst = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            cFrom = toLocalISO(lastMonthFirst);
            
            const lastMonthSameDay = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            cTo = toLocalISO(lastMonthSameDay);
        } else if (range === 'custom') {
            from = document.getElementById('customFrom').value || today;
            to = document.getElementById('customTo').value || today;
            cFrom = null; cTo = null;
        }

        const fmt = (d) => {
            if (!d) return '...';
            // YYYY-MM-DD literal stringini güvenli parse et (UTC kayması olmadan)
            const parts = d.split('-');
            const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
            return dateObj.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
        };
        document.getElementById('selectedRangeLabel').innerText = `${fmt(from)} - ${fmt(to)} Aralığı Gösteriliyor`;

        return { from, to, compareFrom: cFrom, compareTo: cTo };
    },

    renderStats(cur, prev, pending_pos, total_pending_commission) {
        try {
            if (!cur) cur = { vehicle_count: 0, total_income: 0, cash_total: 0, total_expense: 0 };
            if (!prev) prev = { vehicle_count: 0, total_income: 0, cash_total: 0, total_expense: 0 };

            // Değerleri bas
            document.getElementById('todayVehicleCount').innerText = cur.vehicle_count;
            document.getElementById('cashInHand').innerText = App.formatCurrency(cur.cash_total);
            document.getElementById('todayTotalExpense').innerText = App.formatCurrency(cur.total_expense);
            document.getElementById('pendingBank').innerText = App.formatCurrency(pending_pos);

            // Trendleri hesapla ve göster
            this.renderTrend('trendVehicle', cur.vehicle_count, prev.vehicle_count);
            this.renderTrend('trendCash', cur.cash_total, prev.cash_total);
            this.renderTrend('trendExpense', cur.total_expense, prev.total_expense, true);

            // Banka notu
            const n = document.getElementById('pendingCommissionNote');
            if (n) n.innerText = `(Tahmini Kesinti: ${App.formatCurrency(total_pending_commission)})`;

            // Kasa renk
            document.getElementById('cashInHand').style.color = cur.cash_total < 0 ? 'var(--danger)' : '#10b981';

        } catch (error) {
            console.error('Render Stats error:', error);
        }
    },

    renderRecentActivity(recent) {
        try {
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
        } catch (e) {
            console.error('Render Recent error:', e);
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

    async initCharts() {
        // Redundant - functionality moved to loadAll
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
