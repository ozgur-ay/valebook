/**
 * ValeBook Ortak Uygulama Mantığı (JS).
 */

const LANG = {
    feedbackBtn: '\ud83d\udc1e \u00d6neri/Hata Bildir',
    modalTitle: 'Sistem Geri Bildirim Formu',
    modalDesc: 'L\u00fctfen ya\u015fad\u0131\u011f\u0131n\u0131z sorunu veya \u00f6nerinizi detayl\u0131ca yaz\u0131n\u0131z. (Sistem hata raporlar\u0131 otomatik olarak eklenecektir).',
    placeholder: '\u00d6rn: X sayfas\u0131na girince sistem donuyor...',
    attachImgBtn: '\ud83d\udcf0 Ekran G\u00f6r\u00fcnt\u00fcs\u00fc Ekle (Opsiyonel)',
    imgSelected: 'G\u00f6rsel Se\u00e7ildi',
    btnCancel: '\u0130ptal',
    btnSend: 'G\u00f6nder',
    btnSending: 'G\u00f6nderiliyor...',
    errEmpty: 'L\u00fctfen bir mesaj yaz\u0131n',
    successMsg: 'Bildiriminiz ba\u015far\u0131yla iletildi.',
    errPrefix: 'Hata: ',
    errServer: 'Sunucu ile ileti\u015fim kurulamad\u0131.',
    type: 'Kullan\u0131c\u0131 Geri Bildirimi'
};

const App = {
    // Ortak ayarlar
    config: {
        apiUrl: '/api'
    },

    // Başlatma
    init() {
        this.displayCurrentDate();
        this.loadVersion();
        this.setupFeedbackModal();
    },

    setupFeedbackModal() {
        // Fab Button (Floating Action Button) eklentisi
        const btn = document.createElement('button');
        btn.className = 'feedback-fab-btn';
        btn.innerHTML = LANG.feedbackBtn;
        btn.onclick = () => document.getElementById('feedbackModal').classList.add('active');
        document.body.appendChild(btn);

        // Modal HTML eklentisi
        const modalHtml = `
            <div class="feedback-modal-overlay" id="feedbackModal">
                <div class="feedback-modal-content">
                    <div class="feedback-modal-header">
                        <h2>${LANG.modalTitle}</h2>
                        <button class="close-btn" onclick="document.getElementById('feedbackModal').classList.remove('active')">&times;</button>
                    </div>
                    <div class="feedback-modal-body">
                        <p>${LANG.modalDesc}</p>
                        <textarea id="feedbackText" placeholder="${LANG.placeholder}" rows="5"></textarea>
                        <div style="margin-top: 1rem;">
                            <input type="file" id="feedbackScreenshot" accept="image/*" style="display:none">
                            <button class="btn btn-sm btn-secondary" onclick="document.getElementById('feedbackScreenshot').click()" id="lblScreenshotBtn" style="width: 100%; border: 1px dashed var(--text-gray); background: transparent; color: var(--text-gray);">${LANG.attachImgBtn}</button>
                        </div>
                    </div>
                    <div class="feedback-modal-footer">
                        <button class="btn btn-secondary" onclick="document.getElementById('feedbackModal').classList.remove('active')">${LANG.btnCancel}</button>
                        <button class="btn btn-primary" id="sendFeedbackBtn">${LANG.btnSend}</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Görsel seçilince buton textini değiştir
        document.getElementById('feedbackScreenshot').onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const lbl = document.getElementById('lblScreenshotBtn');
                lbl.innerText = '✅ ' + file.name + ' (' + LANG.imgSelected + ')';
                lbl.style.borderColor = 'var(--success)';
                lbl.style.color = 'var(--success)';
            }
        };

        // Gönder işlevi
        document.getElementById('sendFeedbackBtn').onclick = async () => {
            const text = document.getElementById('feedbackText').value.trim();
            if(!text) return this.showToast(LANG.errEmpty, 'error');

            const btnSend = document.getElementById('sendFeedbackBtn');
            btnSend.disabled = true;
            btnSend.innerText = LANG.btnSending;

            // Base64 okuma
            const fileInput = document.getElementById('feedbackScreenshot');
            let base64Image = null;
            if (fileInput.files.length > 0) {
                base64Image = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(fileInput.files[0]);
                });
            }

            try {
                // native fetch for form logic if needed, but since our server expects json for message
                const res = await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: text, type: LANG.type, screenshot: base64Image })
                });
                
                const data = await res.json();
                if(data.success) {
                    this.showToast(LANG.successMsg, 'success');
                    document.getElementById('feedbackModal').classList.remove('active');
                    document.getElementById('feedbackText').value = '';
                    document.getElementById('feedbackScreenshot').value = '';
                    const lbl = document.getElementById('lblScreenshotBtn');
                    lbl.innerText = LANG.attachImgBtn;
                    lbl.style.borderColor = 'var(--text-gray)';
                    lbl.style.color = 'var(--text-gray)';
                } else {
                    this.showToast(LANG.errPrefix + data.message, 'error');
                }
            } catch(e) {
                this.showToast(LANG.errServer, 'error');
            } finally {
                btnSend.disabled = false;
                btnSend.innerText = LANG.btnSend;
            }
        };
    },


    // Tarih gösterimi
    displayCurrentDate() {
        const el = document.getElementById('currentDate');
        if (el) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            el.innerText = new Date().toLocaleDateString('tr-TR', options);
        }
    },

    // Versiyonu yükle (package.json'dan veya sabit)
    async loadVersion() {
        const el = document.getElementById('versionDisplay');
        if (el) {
            try {
                const res = await fetch('/api/update/version');
                const data = await res.json();
                el.innerText = 'ValeBook v' + (data.current || 'X.X.X');
            } catch (e) {
                el.innerText = 'ValeBook';
            }
        }
    },

    // Para birimi formatla
    formatCurrency(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    },

    // API isteği yardımcısı
    async fetchAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'API request failed');
            }
            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Bildirim göster (Alert alternatifi, odağı bozmaz)
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerText = message;
        
        document.body.appendChild(toast);
        
        // Animasyon için bir sonraki frame'de 'show' ekle
        setTimeout(() => toast.classList.add('show'), 100);
        
        // 3 saniye sonra kaldır
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => App.init());
