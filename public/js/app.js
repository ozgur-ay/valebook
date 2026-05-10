/**
 * ValeBook Ortak Uygulama Mantığı (JS).
 */

const App = {
    // Ortak ayarlar
    config: {
        apiUrl: '/api'
    },

    // Başlatma
    init() {
        this.displayCurrentDate();
        this.loadVersion();
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
    loadVersion() {
        const el = document.getElementById('versionDisplay');
        if (el) {
            // Basitlik için şu an harcoded
            el.innerText = 'ValeBook v1.0.0';
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
    }
};

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => App.init());
