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
            const settingsData = await App.fetchAPI('/settings');
            // Settings array olarak geliyorsa map'e çevir
            if (Array.isArray(settingsData)) {
                this.settings = {};
                settingsData.forEach(s => this.settings[s.key] = s.value);
            } else {
                this.settings = settingsData || {};
            }
        } catch (e) {
            console.error('Settings load error', e);
            this.settings = {};
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

            // Fokus iyileştirmesi: Küçük bir gecikmeyle fokus ver (Donma/takılmaları önler)
            setTimeout(() => {
                const input = document.getElementById('collectAmount');
                if (input) {
                    input.focus();
                    if (input.value) input.select();
                }
            }, 100);
        } catch (error) {
            console.error('Pending POS load error:', error);
        }
    },

    renderPending(data) {
        console.log("Rendering pending POS data:", data);
        const body = document.getElementById('pendingPosBody');
        const totalDisplay = document.getElementById('pendingTotal');
        const grossDisplay = document.getElementById('pendingGross');
        const collectedDisplay = document.getElementById('totalCollected');
        
        if (!body) return;
        body.innerHTML = '';
        
        if (!data || data.length === 0) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 3rem; color: var(--text-gray);">Bekleyen bekleyen işlem bulunamadı.</td></tr>';
            if (totalDisplay) totalDisplay.innerText = "₺0,00";
            if (grossDisplay) grossDisplay.innerText = "₺0,00";
            if (collectedDisplay) collectedDisplay.innerText = "₺0,00";
            return;
        }

        let grandTotalNet = 0;
        let grandTotalGross = 0;
        let grandTotalCollected = 0;
        const rate = parseFloat(this.settings.pos_commission_rate) || 0;

        data.forEach(item => {
            try {
                const netExpected = (item.card_amount || 0) * (1 - rate / 100);
                const collected = item.pos_collected_amount || 0;
                const remaining = netExpected - collected;
                
                grandTotalGross += (item.card_amount || 0);
                grandTotalNet += Math.max(0, remaining);
                grandTotalCollected += collected;

                const isFullyCollected = remaining <= 1; // 1 TL altı toleransı
                const statusText = isFullyCollected ? '✅ Tahsil Edildi' : (collected > 0 ? '⏳ Kısmi' : '🆕 Bekliyor');
                const statusClass = isFullyCollected ? 'text-success' : (collected > 0 ? 'text-warning' : 'text-primary');

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.date ? new Date(item.date).toLocaleDateString('tr-TR') : '-'}</td>
                    <td>₺${Math.round(item.card_amount || 0).toLocaleString('tr-TR')}</td>
                    <td>₺${Math.round(netExpected).toLocaleString('tr-TR')}</td>
                    <td class="text-success">₺${Math.round(collected).toLocaleString('tr-TR')}</td>
                    <td class="neon-text-blue">₺${Math.round(Math.max(0, remaining)).toLocaleString('tr-TR')}</td>
                    <td class="${statusClass}">${statusText}</td>
                `;
                body.appendChild(tr);
            } catch (err) {
                console.error("Row render error:", err, item);
            }
        });

        if (totalDisplay) totalDisplay.innerText = Math.round(grandTotalNet).toLocaleString('tr-TR') + " ₺";
        if (grossDisplay) grossDisplay.innerText = Math.round(grandTotalGross).toLocaleString('tr-TR') + " ₺";
        if (collectedDisplay) collectedDisplay.innerText = Math.round(grandTotalCollected).toLocaleString('tr-TR') + " ₺";
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
                document.getElementById('btnUndoCollection').style.display = 'inline-flex';
                await this.init();
            } else {
                App.showToast('Tahsil edilecek bekleyen işlem bulunamadı.', 'info');
            }
        } catch (e) {
            App.showToast('Hata oluştu: ' + e.message, 'danger');
        }
    },

    async undoCollection() {
        if (!confirm('Son tahsilat işlemini geri almak istediğinize emin misiniz?')) return;
        try {
            await App.fetchAPI('/income/undo-collection', { method: 'POST' });
            document.getElementById('btnUndoCollection').style.display = 'none';
            App.showToast('Tahsilat geri alındı.', 'warning');
            await this.init();
        } catch (e) {
            App.showToast('Geri alma başarısız oldu.', 'danger');
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
            document.getElementById('btnUndoCollection').style.display = 'inline-flex';
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
            document.getElementById('btnUndoCollection').style.display = 'inline-flex';
            await this.loadPending();
            App.showToast('Tümü tahsil edildi.');
        } catch (e) {
            App.showToast('Hata oluştu.');
        }
    },

    async showDebug() {
        try {
            const data = await App.fetchAPI('/income/debug-db');
            console.table(data);
            alert("Debugging Data:\n" + JSON.stringify(data.slice(0, 5), null, 2) + "\n\n(Tam liste konsola basıldı - F12)");
        } catch (e) {
            alert("Debug failed: " + e.message);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => POS.init());
