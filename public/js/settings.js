/**
 * ValeBook Ayarlar ve Güncelleme Mantığı.
 */

const Settings = {
    async init() {
        await this.loadSettings();
        await this.loadCategories();
        this.updateVersionInfo();
    },

    async updateVersionInfo() {
        try {
            const result = await App.fetchAPI('/update/version');
            this.currentVersion = result.current;
            document.getElementById('currentVersion').innerText = 'v' + result.current;
        } catch (e) {
            this.currentVersion = 'X.X.X';
            document.getElementById('currentVersion').innerText = 'v' + this.currentVersion + ' (Bilinmiyor)';
        }
    },

    async loadSettings() {
        try {
            const settings = await App.fetchAPI('/settings');
            document.getElementById('business_name').value = settings.business_name || '';
            document.getElementById('pos_commission_rate').value = settings.pos_commission_rate || 0;
        } catch (error) {
            console.error('Settigns load error:', error);
        }

        const form = document.getElementById('settingsForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const data = {
                business_name: document.getElementById('business_name').value,
                pos_commission_rate: document.getElementById('pos_commission_rate').value
            };
            try {
                await App.fetchAPI('/settings', {
                    method: 'PUT',
                    body: JSON.stringify(data)
                });
                App.showToast('Ayarlar kaydedildi.');
            } catch (error) {
                App.showToast('Kayıt hatası.', 'danger');
            }
        };
    },

    async loadCategories() {
        try {
            const categories = await App.fetchAPI('/settings/categories');
            const list = document.getElementById('categoryList');
            list.innerHTML = '';
            
            categories.forEach(cat => {
                const div = document.createElement('div');
                div.className = 'category-item';
                div.innerHTML = `
                    <span>${cat.name} ${cat.is_default ? '<small>(Varsayılan)</small>' : ''}</span>
                    <button class="btn-sm btn-danger" onclick="Settings.deleteCategory(${cat.id})">Sil</button>
                `;
                list.appendChild(div);
            });
        } catch (error) {
            console.error('Categories load error:', error);
        }
    },

    async addCategory() {
        const input = document.getElementById('newCategoryName');
        const name = input.value.trim();
        if (!name) return;

        try {
            await App.fetchAPI('/settings/categories', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            input.value = '';
            await this.loadCategories();
            App.showToast('Kategori eklendi.');
        } catch (error) {
            App.showToast('Kategori eklenemedi.', 'danger');
        }
    },

    async deleteCategory(id) {
        if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
        try {
            await App.fetchAPI(`/settings/categories/${id}`, { method: 'DELETE' });
            await this.loadCategories();
        } catch (error) {
            alert(error.message || 'Silme işlemi başarısız.');
        }
    },

    async restoreDefaultCategories() {
        if (!confirm('Silinmiş olan varsayılan kategoriler yeniden eklensin mi?')) return;
        try {
            await App.fetchAPI('/settings/categories/restore-defaults', { method: 'POST' });
            await this.loadCategories();
            alert('Varsayılan kategoriler başarıyla geri yüklendi.');
        } catch (error) {
            alert(error.message || 'Geri yükleme işlemi başarısız.');
        }
    },

    // Güncelleme Kontrolü
    async checkUpdates() {
        const btn = document.getElementById('checkUpdateBtn');
        const status = document.getElementById('updateStatus');
        
        btn.disabled = true;
        status.innerText = 'Kontrol ediliyor...';

        try {
            const result = await App.fetchAPI('/update/check');
            if (result.available) {
                status.innerHTML = `<span class="text-success">✅ Yeni versiyon bulundu: ${result.latestVersion}</span>`;
                document.getElementById('installUpdateBtn').style.display = 'inline-flex';
            } else {
                status.innerText = 'Uygulamanız güncel.';
            }
        } catch (error) {
            status.innerText = 'Güncelleme kontrolü başarısız.';
        } finally {
            btn.disabled = false;
        }
    },

    async installUpdate() {
        const status = document.getElementById('updateStatus');
        status.innerText = 'Güncelleme başlatıldı, indirme bekleniyor...';
        
        try {
            await App.fetchAPI('/update/install', { method: 'POST' });
        } catch (error) {
            App.showToast('Güncelleme yüklenirken hata oluştu.', 'danger');
        }
    },

    bindUpdateEvents() {
        if (!window.electronAPI || !window.electronAPI.onUpdateStatus) return;

        // Renderer açıldığında mevcut durumu iste (Donma sorununu çözer)
        window.electronAPI.getUpdateStatus().then(info => {
            if (info) this.renderUpdateStatus(info);
        });

        window.electronAPI.onUpdateStatus((info) => {
            this.renderUpdateStatus(info);
        });
    },

    renderUpdateStatus(info) {
        const status = document.getElementById('updateStatus');
        const installBtn = document.getElementById('installUpdateBtn');
        if (!status || !installBtn) return;

        switch (info.type) {
            case 'checking':
                status.innerText = 'Güncelleme kontrol ediliyor...';
                installBtn.style.display = 'none';
                break;
            case 'available':
                status.innerHTML = `<span class="text-success">✅ Yeni Sürüm v${info.version} Mevcut!</span>`;
                installBtn.innerHTML = 'Güncellemeyi İndir';
                installBtn.style.display = 'inline-flex';
                installBtn.onclick = () => Settings.installUpdate();
                break;
            case 'progress':
                const percent = Math.round(info.percent);
                status.innerHTML = `
                    <div style="margin-top: 0.5rem;">
                        <span>İndiriliyor: %${percent}</span>
                        <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-top: 4px; overflow: hidden;">
                            <div style="width: ${percent}%; height: 100%; background: var(--success); transition: width 0.3s;"></div>
                        </div>
                    </div>
                `;
                installBtn.style.display = 'none';
                break;
            case 'not-available':
                status.innerHTML = `<span class="text-success">✨ Yazılım Güncel (v${this.currentVersion || ''})</span>`;
                installBtn.style.display = 'none';
                break;
            case 'error':
                status.innerHTML = `<span class="text-danger">❌ Hata: Güncelleme bilgisi alınamadı.</span>`;
                installBtn.style.display = 'none';
                break;
            case 'downloaded':
                status.innerHTML = `<span class="text-success">✨ Güncelleme hazır!</span>`;
                installBtn.innerHTML = 'Şimdi Yeniden Başlat';
                installBtn.style.display = 'inline-flex';
                installBtn.onclick = () => {
                    // Update endpoint'ine git ve restart iste (main process handle edecek)
                    App.fetchAPI('/update/install', { method: 'POST' });
                };
                break;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Settings.init();
    Settings.bindUpdateEvents();
});
