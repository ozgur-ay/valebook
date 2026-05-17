const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./src/database');

/**
 * ValeBook Express Sunucu Yapılandırması.
 */

const app = express();
const PORT = process.env.PORT || 3000;

const logger = require('./src/utils/logger.js');

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Küresel Bütün İstekleri Loglama Sistemi
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        logger.info(`HTTP Request`, { method: req.method, url: req.url, query: req.query, body: req.body });
    }
    next();
});

// --- API Rotaları ---
app.use('/api/income', require('./src/routes/income'));
app.use('/api/expense', require('./src/routes/expense'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/update', require('./src/routes/update'));
app.use('/api/feedback', require('./src/routes/feedback'));

// Kullanım Kılavuzu İndirme Rotası
app.get('/api/download-guide', (req, res) => {
    const filePath = path.join(__dirname, 'KULLANIM_KILAVUZU.txt');
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'ValeBook_Kullanim_Kilavuzu.txt');
    } else {
        res.status(404).json({ error: 'Kılavuz dosyası bulunamadı.' });
    }
});

// Küresel REST İşlem Hataları Yakalayıcısı
app.use((err, req, res, next) => {
    logger.error(`Express Global Error: ${err.message}`, { url: req.url }, err);
    res.status(500).json({ error: err.message });
});

// --- Ana Sayfa ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat ve tarayıcıyı otomatik aç
app.listen(PORT, async () => {
    console.log(`ValeBook sunucusu http://localhost:${PORT} portunda çalışıyor.`);
    
    // Tarayıcıyı otomatik açmak için (sadece sunucu başladığında ve Electron ortamı değilse)
    if (!process.versions || !process.versions.electron) {
        try {
            const { default: open } = await import('open');
            await open(`http://localhost:${PORT}`);
        } catch (err) {
            console.error('Tarayıcı otomatik açılamadı:', err);
        }
    }
});

module.exports = app;
