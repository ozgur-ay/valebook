/**
 * ValeBook Gider Yönetimi Mantığı.
 */

const Expense = {
    async init() {
        this.setupForm();
        await this.loadCategories();
        await this.loadHistory();
        this.setToday();
    },

    setToday() {
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
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
                form.reset();
                this.setToday();
                await this.loadHistory();
                alert('Gider kaydı başarıyla eklendi.');
            } catch (error) {
                alert('Kayıt sırasında hata oluştu: ' + error.message);
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
        } catch (error) {
            alert('Silme işlemi başarısız.');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => Expense.init());
