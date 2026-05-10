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
        body.innerHTML = '';
        
        let grandTotal = 0;
        const rate = parseFloat(this.settings.pos_commission_rate) || 0;

        data.forEach(item => {
            const commission = item.card_amount * (rate / 100);
            const net = item.card_amount - commission;
            grandTotal += net;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                <td>₺${item.card_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td>%${rate} (₺${commission.toLocaleString('tr-TR', { minimumFractionDigits: 2 })})</td>
                <td class="neon-text-blue">₺${net.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick="POS.collect(${item.id})">Tahsil Et</button>
                </td>
            `;
            body.appendChild(tr);
        });

        totalDisplay.innerText = grandTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
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
