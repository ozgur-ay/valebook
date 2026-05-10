/**
 * ValeBook Gelir Yönetimi Mantığı.
 */

const Income = {
    async init() {
        this.setupForm();
        await this.loadLastEntry(); // Önce son veriyi çek
        await this.loadHistory();
        this.setToday(); // Tarihi bugüne sabitle
    },

    setToday() {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    },

    // Tarihi bugün yap(birim ücret) yükle
    // En son girilen kaydı forma doldur (Hatırlatma özelliği)
    async loadLastEntry() {
        try {
            const last = await App.fetchAPI('/income/last');
            if (last && last.id) {
                document.getElementById('vehicleCount').value = last.vehicle_count || '';
                document.getElementById('unitFee').value = last.unit_fee || 50;
                document.getElementById('paymentMethod').value = last.payment_method || 'cash';
                document.getElementById('note').value = last.note || '';
                
                // Toplamı ve görünürlüğü tetikle
                const event = new Event('change');
                document.getElementById('paymentMethod').dispatchEvent(event);
                const inputEvent = new Event('input');
                document.getElementById('vehicleCount').dispatchEvent(inputEvent);
                
                // Karışık ödeme ise rakamları da çek
                if (last.payment_method === 'mixed') {
                    document.getElementById('cashAmount').value = last.cash_amount;
                    document.getElementById('cardAmount').value = last.card_amount;
                }
            } else {
                // Hiç kayıt yoksa varsayılan ayarları yükle
                await this.loadSettings();
            }
        } catch (error) {
            console.error('Last entry load error:', error);
            await this.loadSettings();
        }
    },

    setupForm() {
        const form = document.getElementById('incomeForm');
        const dateInput = document.getElementById('date');
        
        // Tarih hücresine tıklandığında takvimi aç
        dateInput.addEventListener('click', () => {
            try {
                if (typeof dateInput.showPicker === 'function') {
                    dateInput.showPicker();
                }
            } catch (e) {
                console.warn('showPicker not supported');
            }
        });

        // Geri/İleri Al butonları
        document.getElementById('btnUndo').addEventListener('click', async () => {
            try {
                await App.fetchAPI('/income/undo', { method: 'POST' });
                await this.loadHistory();
                await this.loadLastEntry();
                App.showToast('İşlem geri alındı.');
            } catch (e) {
                App.showToast('Geri alınacak işlem yok.', 'warning');
            }
        });

        document.getElementById('btnRedo').addEventListener('click', async () => {
            try {
                await App.fetchAPI('/income/redo', { method: 'POST' });
                await this.loadHistory();
                await this.loadLastEntry();
                App.showToast('İşlem ileri alındı.');
            } catch (e) {
                App.showToast('İleri alınacak işlem yok.', 'warning');
            }
        });

        if (!form) return;
        const vehicleInput = document.getElementById('vehicleCount');
        const feeInput = document.getElementById('unitFee');
        const totalInput = document.getElementById('totalAmount');
        const methodSelect = document.getElementById('paymentMethod');
        const cashGroup = document.getElementById('cashAmountGroup');
        const cardGroup = document.getElementById('cardAmountGroup');
        const cashInput = document.getElementById('cashAmount');
        const cardInput = document.getElementById('cardAmount');

        // Otomatik toplam hesapla
        const updateTotals = () => {
            const total = (vehicleInput.value || 0) * (feeInput.value || 0);
            totalInput.value = total.toFixed(2);
            
            if (methodSelect.value === 'cash') {
                cashInput.value = total.toFixed(2);
                cardInput.value = 0;
                cashGroup.style.display = 'block';
                cardGroup.style.display = 'none';
            } else if (methodSelect.value === 'credit_card') {
                cardInput.value = total.toFixed(2);
                cashInput.value = 0;
                cashGroup.style.display = 'none';
                cardGroup.style.display = 'block';
            } else {
                cashGroup.style.display = 'block';
                cardGroup.style.display = 'block';
            }
        };

        vehicleInput.addEventListener('input', updateTotals);
        feeInput.addEventListener('input', updateTotals);
        methodSelect.addEventListener('change', updateTotals);

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                date: document.getElementById('date').value,
                vehicle_count: parseInt(vehicleInput.value),
                unit_fee: parseFloat(feeInput.value),
                total_amount: parseFloat(totalInput.value),
                payment_method: methodSelect.value,
                cash_amount: parseFloat(cashInput.value || 0),
                card_amount: parseFloat(cardInput.value || 0),
                pos_status: methodSelect.value === 'cash' ? 'na' : 'pending',
                note: document.getElementById('note').value
            };

            try {
                await App.fetchAPI('/income', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                await this.loadHistory();
                App.showToast('Gelir kaydı başarıyla eklendi.');
                // Formu tamamen temizlemek yerine son verileri koruyoruz
                // Sadece araç sayısına odaklan
                document.getElementById('vehicleCount').focus();
            } catch (error) {
                App.showToast('Kayıt sırasında hata oluştu: ' + error.message, 'danger');
            }
        });
    },

    async loadHistory() {
        try {
            const history = await App.fetchAPI('/income');
            const tbody = document.querySelector('#incomeTable tbody');
            tbody.innerHTML = '';

            history.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                    <td>${item.vehicle_count}</td>
                    <td>${App.formatCurrency(item.cash_amount)}</td>
                    <td>${App.formatCurrency(item.card_amount)}</td>
                    <td>${App.formatCurrency(item.total_amount)}</td>
                    <td>
                        <button class="btn-sm btn-danger" onclick="Income.deleteItem(${item.id})">Sil</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('History load error:', error);
        }
    },

    async deleteItem(id) {
        if (!confirm('Bu gelir kaydını silmek istediğinize emin misiniz?')) return;
        try {
            await App.fetchAPI(`/income/${id}`, { method: 'DELETE' });
            await this.loadHistory();
            App.showToast('Kayıt silindi.', 'warning');
        } catch (error) {
            App.showToast('Silme işlemi başarısız.', 'danger');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Income.init());
