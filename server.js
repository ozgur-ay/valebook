const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('./src/database');

/**
 * ValeBook Express Sunucu Yapılandırması.
 */

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API Rotaları ---
app.use('/api/income', require('./src/routes/income'));
app.use('/api/expense', require('./src/routes/expense'));
app.use('/api/dashboard', require('./src/routes/dashboard'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/update', require('./src/routes/update'));

// --- Ana Sayfa ---
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Sunucuyu başlat ve tarayıcıyı otomatik aç
app.listen(PORT, async () => {
    console.log(`ValeBook sunucusu http://localhost:${PORT} portunda çalışıyor.`);
    
    // Tarayıcıyı otomatik açmak için (sadece sunucu başladığında)
    try {
        const { default: open } = await import('open');
        await open(`http://localhost:${PORT}`);
    } catch (err) {
        console.error('Tarayıcı otomatik açılamadı:', err);
    }
});

module.exports = app;
