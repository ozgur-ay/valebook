/**
 * ValeBook Gider Yönetimi Mantığı.
 */

const Expense = {
    async init() {
        this.setupForm();
        await this.loadCategories();
        await this.loadLastEntry();
        await this.loadHistory();
        this.setToday();
    },

    setToday() {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
    },

    // En son gideri hatırla
    async loadLastEntry() {
        try {
            const last = await App.fetchAPI('/expense/last');
            if (last && last.id) {
                document.getElementById('category').value = last.category;
                document.getElementById('description').value = last.description;
                document.getElementById('amount').value = last.amount;
                document.getElementById('paymentMethod').value = last.payment_method;
                document.getElementById('documentNo').value = last.document_no || '';
                document.getElementById('note').value = last.note || '';
            }
        } catch (error) {
            console.error('Last expense load error:', error);
        }
    },

    // Kategorileri yükle
    async loadCategories() {
        try {
            // Şu an için harcoded, ayarlar bitince oradan gelecek
            const categories = [
                'Personel', 'Aidat', 'Bakım-Onarım', 'Vergi & SGK', 
                'POS Komisyonu', 'Sigorta', 'Malzeme/Sarf', 'Diğer'
            ];
            const select = document.getElementById('category');
            select.innerHTML = '';
            
            categories.forEach(cat => {
                const opt = document.createElement('option');
                opt.value = cat;
                opt.innerText = cat;
                select.appendChild(opt);
            });
        } catch (error) {
            console.error('Categories load error:', error);
        }
    },

    setupForm() {
        const form = document.getElementById('expenseForm');
        const dateInput = document.getElementById('date');

        // Tarih hücresine tıklandığında takvimi aç
        if (dateInput) {
            dateInput.addEventListener('click', () => {
                try {
                    if (typeof dateInput.showPicker === 'function') {
                        dateInput.showPicker();
                    }
                } catch (e) {
                    console.warn('showPicker not supported');
                }
            });
        }

        // Geri/İleri Al
        document.getElementById('btnUndo').addEventListener('click', async () => {
            try {
                await App.fetchAPI('/expense/undo', { method: 'POST' });
                await this.loadHistory();
                await this.loadLastEntry();
                App.showToast('İşlem geri alındı.');
            } catch (e) {
                App.showToast('Geri alınacak işlem yok.', 'warning');
            }
        });

        document.getElementById('btnRedo').addEventListener('click', async () => {
            try {
                await App.fetchAPI('/expense/redo', { method: 'POST' });
                await this.loadHistory();
                await this.loadLastEntry();
                App.showToast('İşlem ileri alındı.');
            } catch (e) {
                App.showToast('İleri alınacak işlem yok.', 'warning');
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                date: document.getElementById('date').value,
                category: document.getElementById('category').value,
                description: document.getElementById('description').value,
                amount: parseFloat(document.getElementById('amount').value),
                payment_method: document.getElementById('paymentMethod').value,
                document_no: document.getElementById('documentNo').value,
                note: document.getElementById('note').value
            };

            try {
                await App.fetchAPI('/expense', {
                    method: 'POST',
                    body: JSON.stringify(data)
                });
                await this.loadHistory();
                App.showToast('Gider kaydı başarıyla eklendi.');
                document.getElementById('amount').focus();
            } catch (error) {
                App.showToast('Kayıt sırasında hata oluştu: ' + error.message, 'danger');
            }
        });
    },

    async loadHistory() {
        try {
            const history = await App.fetchAPI('/expense');
            const tbody = document.querySelector('#expenseTable tbody');
            tbody.innerHTML = '';

            history.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${new Date(item.date).toLocaleDateString('tr-TR')}</td>
                    <td>${item.category}</td>
                    <td>${item.description}</td>
                    <td class="text-danger">-${App.formatCurrency(item.amount)}</td>
                    <td>
                        <button class="btn-sm btn-danger" onclick="Expense.deleteItem(${item.id})">Sil</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error('History load error:', error);
        }
    },

    async deleteItem(id) {
        if (!confirm('Bu gider kaydını silmek istediğinize emin misiniz?')) return;
        try {
            await App.fetchAPI(`/expense/${id}`, { method: 'DELETE' });
            await this.loadHistory();
            App.showToast('Gider kaydı silindi.', 'warning');
        } catch (error) {
            App.showToast('Silme işlemi başarısız.', 'danger');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Expense.init());
