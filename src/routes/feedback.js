const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Global fetch is available in Node 18+ (Electron 30 = Node 20)
const TELEGRAM_TOKEN = '8232462618:AAH2V8Rxe8PystpgSmjK7qOfRb7p53nSOKk';
// Chat ID will be set once we get it
const TELEGRAM_CHAT_ID = '-1003890716233';
const TELEGRAM_THREAD_ID = '6';

router.post('/', async (req, res) => {
    try {
        const { message, user, type, screenshot } = req.body;
        
        if (!TELEGRAM_CHAT_ID) {
            console.error('Telegram Chat ID not set');
            return res.status(500).json({ success: false, message: 'Server configuration missing' });
        }

        const text = `🚨 *ValeBook Feedback* 🚨\n\n*Type:* ${type || 'General'}\n*User:* ${user || 'Unknown'}\n*Message:*\n${message}`;

        const errorLogPath = path.join(__dirname, '../../valebook-error.log');
        let logContent = `--- ValeBook Diagnostic Log ---\n Tarih: ${new Date().toISOString()}\n İşletim Sistemi: ${process.platform} ${process.arch}\n Node Sürümü: ${process.version}\n Açık Kalma Süresi: ${process.uptime()} sn\n\n`;
        
        if (fs.existsSync(errorLogPath)) {
            logContent += `--- CRITICAL ERRORS ---\n${fs.readFileSync(errorLogPath, 'utf8')}`;
        } else {
            logContent += `--- CRITICAL ERRORS ---\nBu oturumda tespit edilen kritik bir hata (crash) bulunmamaktadır.\n`;
        }

        let telegramPromises = [];

        if (screenshot) {
            const base64Data = screenshot.split(',')[1];
            const buffer = Buffer.from(base64Data, 'base64');
            const fileBlob = new Blob([buffer]);

            const photoData = new FormData();
            photoData.append('chat_id', TELEGRAM_CHAT_ID);
            if (TELEGRAM_THREAD_ID) photoData.append('message_thread_id', TELEGRAM_THREAD_ID);
            photoData.append('caption', text);
            photoData.append('parse_mode', 'Markdown');
            photoData.append('photo', fileBlob, 'screenshot.jpeg');

            telegramPromises.push(
                fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`, { method: 'POST', body: photoData })
            );
        } else {
            const msgData = new FormData();
            msgData.append('chat_id', TELEGRAM_CHAT_ID);
            if (TELEGRAM_THREAD_ID) msgData.append('message_thread_id', TELEGRAM_THREAD_ID);
            msgData.append('text', text);
            msgData.append('parse_mode', 'Markdown');
            
            telegramPromises.push(
                fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { method: 'POST', body: msgData })
            );
        }

        // HER ZAMAN LOG GÖNDER (Diagnostic veya Crash)
        const logData = new FormData();
        logData.append('chat_id', TELEGRAM_CHAT_ID);
        if (TELEGRAM_THREAD_ID) logData.append('message_thread_id', TELEGRAM_THREAD_ID);
        logData.append('caption', "📄 ValeBook Sistem Raporu");
        const logBlob = new Blob([Buffer.from(logContent, 'utf8')]);
        logData.append('document', logBlob, 'valebook-diagnostic.log');

        telegramPromises.push(
            fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, { method: 'POST', body: logData })
        );

        const responses = await Promise.all(telegramPromises);
        const data = await responses[0].json();

        if (data.ok) {
            res.json({ success: true, message: 'Feedback sent successfully.' });
        } else {
            console.error('Telegram Error:', data);
            res.status(500).json({ success: false, message: 'Failed to send to Telegram.' });
        }
        
    } catch (error) {
        console.error('Feedback send error:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
});

module.exports = router;
