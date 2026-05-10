/**
 * POS Tahsilat ve Yönetim Mantığı.
 */

const POS = {
    settings: { pos_commission_rate: 0 },

    async init() {
        await this.loadSettings();
        await this.loadPending();
    },

    async loadSettings() {
        try {
            this.settings = await App.fetchAPI('/settings');
        } catch (e) {
            console.error('Settings load error', e);
        }
    },

    async loadPending() {
        try {
            // Backend'den bekleyen POS işlemlerini çek
            // Şimdilik /income filtresini kullanıyoruz ama backend'e özel endpoint ekleyebiliriz
            const allIncome = await App.fetchAPI('/income');
            
            // Not: Backend consolidation yaptığı için ham veriye erişmek için /income/raw gibi bir endpoint gerekebilir 
            // ama şimdilik consolidate edilmiş date bazlı veriden gidelim.
            // ASLINDA: POS takibi ham veri üzerinden olmalı.
            
            // Backend'e ham bekleyenleri getiren bir endpoint ekleyelim.
            const pending = await App.fetchAPI('/income/pending-pos');
            this.renderPending(pending);
        } catch (error) {
            console.error('Pending POS load error:', error);
        }
    },

    renderPending(data) {
        const body = document.getElementById('pendingPosBody');
        const totalDisplay = document.getElementById('pendingTotal');
        const grossDisplay = document.getElementById('pendingGross');
        const collectedDisplay = document.getElementById('totalCollected');
        
        body.innerHTML = '';
        
        let grandTotalNet = 0;
        let grandTotalGross = 0;
        let grandTotalCollected = 0;
        const rate = parseFloat(this.settings.pos_commission_rate) || 0;

        data.forEach(item => {
            const netExpected = item.card_amount * (1 - rate / 100);
            const collected = item.pos_collected_amount || 0;
            const remaining = netExpected - collected;
            
            grandTotalGross += item.card_amount;
            grandTotalNet += remaining;
            grandTotalCollected += collected;

            const isFullyCollected = remaining <= 0.01;
            const statusText = isFullyCollected ? '✅ Tahsil Edildi' : (collected > 0 ? '⏳ Kısmi' : '🆕 Bekliyor');
            const statusClass = isFullyCollected ? 'text-success' : (collected > 0 ? 'text-warning' : 'text-primary');

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                <td>₺${item.card_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td>₺${netExpected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td class="text-success">₺${collected.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td class="neon-text-blue">₺${Math.max(0, remaining).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td class="${statusClass}">${statusText}</td>
            `;
            body.appendChild(tr);
        });

        totalDisplay.innerText = grandTotalNet.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
        grossDisplay.innerText = grandTotalGross.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
        collectedDisplay.innerText = grandTotalCollected.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    },

    async collectAmount() {
        const amountInput = document.getElementById('collectAmount');
        const amount = parseFloat(amountInput.value);

        if (isNaN(amount) || amount <= 0) {
            App.showToast('Lütfen geçerli bir tutar girin.', 'warning');
            return;
        }

        try {
            const res = await App.fetchAPI('/income/collect-amount', {
                method: 'POST',
                body: JSON.stringify({ amount })
            });

            if (res.processed_updates > 0) {
                App.showToast(`${res.processed_updates} işlem güncellendi.`);
                amountInput.value = '';
                await this.init();
            } else {
                App.showToast('Tahsil edilecek bekleyen işlem bulunamadı.', 'info');
            }
        } catch (e) {
            App.showToast('Hata oluştu: ' + e.message, 'danger');
        }
    },

    async collect(id) {
        try {
            await App.fetchAPI(`/income/${id}/pos-status`, {
                method: 'PUT',
                body: JSON.stringify({ 
                    pos_status: 'collected',
                    pos_collected_date: new Date().toISOString().split('T')[0]
                })
            });
            App.showToast('Tahsilat kaydedildi.');
            await this.loadPending();
        } catch (e) {
            App.showToast('Hata oluştu.');
        }
    },

    async collectAll() {
        if (!confirm('Tüm bekleyen işlemleri tahsil edildi olarak işaretlemek istiyor musunuz?')) return;
        // Basitlik için seri olarak yapalım veya backend'e toplu endpoint ekleyelim
        App.showToast('İşlem başlatıldı...');
        // Şimdilik backend'e toplu endpoint ekleyelim daha sağlıklı olur.
        try {
            await App.fetchAPI('/income/collect-all-pos', { method: 'POST' });
            await this.loadPending();
            App.showToast('Tümü tahsil edildi.');
        } catch (e) {
            App.showToast('Hata oluştu.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => POS.init());
