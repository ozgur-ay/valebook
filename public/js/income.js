/**
 * ValeBook Gelir Yönetimi Mantığı.
 */

const Income = {
    async init() {
        this.setupForm();
        await this.loadSettings();
        await this.loadHistory();
        this.setToday();
    },

    setToday() {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    },

    // Tarihi bugün yap(birim ücret) yükle
    async loadSettings() {
        try {
            // Şu an için varsayılan 50 TL, ayarlar API'si bitince oradan gelecek
            document.getElementById('unitFee').value = 50;
        } catch (error) {
            console.error('Settings load error:', error);
        }
    },

    setupForm() {
        const form = document.getElementById('incomeForm');
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
                vehicleInput.focus(); // Form resetlendiği için odağı geri al
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
