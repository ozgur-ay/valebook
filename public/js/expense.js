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
            const editingId = document.getElementById('editingId').value;
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
                if (editingId) {
                    await App.fetchAPI(`/expense/${editingId}`, {
                        method: 'PUT',
                        body: JSON.stringify(data)
                    });
                    App.showToast('Gider kaydı güncellendi.');
                    document.getElementById('editingId').value = '';
                    form.querySelector('button[type="submit"]').innerText = 'Kaydet';
                } else {
                    await App.fetchAPI('/expense', {
                        method: 'POST',
                        body: JSON.stringify(data)
                    });
                    App.showToast('Gider kaydı başarıyla eklendi.');
                }
                
                await this.loadHistory();
                document.getElementById('amount').focus();
            } catch (error) {
                App.showToast('İşlem sırasında hata oluştu: ' + error.message, 'danger');
            }
        });
    },

    async loadHistory() {
        try {
            const history = await App.fetchAPI('/expense');
            const tbody = document.querySelector('#expenseTable tbody');
            tbody.innerHTML = '';

            history.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = 'expandable-row';
                tr.dataset.index = index;
                tr.innerHTML = `
                    <td>
                        <span class="toggle-icon">▶</span>
                        ${new Date(item.date).toLocaleDateString('tr-TR')}
                    </td>
                    <td><span class="category-badge">${item.category}</span></td>
                    <td>${item.description}</td>
                    <td class="text-danger">-${App.formatCurrency(item.amount)}</td>
                    <td>
                        <small style="color:var(--text-gray)">Detay ve Düzenleme</small>
                    </td>
                `;
                
                tr.addEventListener('click', () => this.toggleDetails(tr, item));
                tbody.appendChild(tr);

                const detailTr = document.createElement('tr');
                detailTr.className = 'details-row';
                detailTr.id = `details-${index}`;
                detailTr.style.display = 'none';
                detailTr.innerHTML = `<td colspan="5" class="details-container"></td>`;
                tbody.appendChild(detailTr);
            });
        } catch (error) {
            console.error('History load error:', error);
        }
    },

    toggleDetails(row, data) {
        const index = row.dataset.index;
        const detailRow = document.getElementById(`details-${index}`);
        const isActive = row.classList.contains('active');

        document.querySelectorAll('.expandable-row').forEach(r => r.classList.remove('active'));
        document.querySelectorAll('.details-row').forEach(r => r.style.display = 'none');

        if (!isActive) {
            row.classList.add('active');
            detailRow.style.display = 'table-row';
            
            const container = detailRow.querySelector('.details-container');
            const items = data.details ? data.details.split(';;;') : [];
            let detailHtml = `
                <div class="details-content">
                    <table class="details-table">
                        <thead>
                            <tr>
                                <th>Kategori</th>
                                <th>Açıklama</th>
                                <th>Ödeme</th>
                                <th>Tutar</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            const parsedItems = items.filter(i => i.trim()).map(itemStr => {
                const [cat, desc, amt, method, id, docNo, note] = itemStr.split(':::');
                return { cat, desc, amt: parseFloat(amt), method, id, docNo, note, date: data.date };
            });

            parsedItems.forEach(item => {
                const methodText = item.method === 'cash' ? 'Nakit' : 'Kredi Kartı';
                const rowObj = JSON.stringify(item).replace(/"/g, '&quot;');

                detailHtml += `
                    <tr>
                        <td><span class="category-badge">${item.cat}</span></td>
                        <td>${item.desc || '-'}</td>
                        <td style="font-size: 0.75rem; color: var(--text-gray)">${methodText}</td>
                        <td class="text-danger">-${App.formatCurrency(item.amt)}</td>
                        <td>
                            <button class="btn btn-sm" style="background:transparent; padding:2px;" onclick="Expense.startEdit('${rowObj}'); event.stopPropagation();">✏️</button>
                            <button class="btn btn-sm" style="background:transparent; padding:2px;" onclick="Expense.deleteItem(${item.id}); event.stopPropagation();">🗑️</button>
                        </td>
                    </tr>
                `;
            });

            detailHtml += `</tbody></table></div>`;
            container.innerHTML = detailHtml;
        }
    },

    startEdit(itemStr) {
        const item = JSON.parse(itemStr.replace(/&quot;/g, '"'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        document.getElementById('editingId').value = item.id;
        document.getElementById('date').value = item.date;
        document.getElementById('category').value = item.cat;
        document.getElementById('description').value = item.desc || '';
        document.getElementById('amount').value = item.amt;
        document.getElementById('paymentMethod').value = item.method;
        document.getElementById('documentNo').value = item.docNo || '';
        document.getElementById('note').value = item.note || '';

        const btn = document.querySelector('#expenseForm button[type="submit"]');
        btn.innerText = 'Güncelle';
        btn.classList.replace('btn-primary', 'btn-warning');

        App.showToast('Düzenleme modu aktif.', 'info');
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
