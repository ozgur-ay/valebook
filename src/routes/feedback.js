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
        const { message, user, type } = req.body;
        
        if (!TELEGRAM_CHAT_ID) {
            console.error('Telegram Chat ID not set');
            return res.status(500).json({ success: false, message: 'Server configuration missing' });
        }

        const text = `🚨 *ValeBook Feedback* 🚨\n\n*Type:* ${type || 'General'}\n*User:* ${user || 'Unknown'}\n*Message:*\n${message}`;

        const errorLogPath = path.join(__dirname, '../../valebook-error.log');
        let hasLogFile = fs.existsSync(errorLogPath);

        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        if (TELEGRAM_THREAD_ID) {
            formData.append('message_thread_id', TELEGRAM_THREAD_ID);
        }
        formData.append('caption', text);
        formData.append('parse_mode', 'Markdown');

        if (hasLogFile) {
            const fileBlob = new Blob([fs.readFileSync(errorLogPath)]);
            formData.append('document', fileBlob, 'valebook-error.log');
        } else {
            // Eğer dosya yoksa düz mesaj at
            formData.append('text', text);
        }

        const url = hasLogFile 
            ? `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`
            : `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

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
