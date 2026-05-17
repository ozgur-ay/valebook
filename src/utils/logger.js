const fs = require('fs');
const path = require('path');

let LOG_FILE, OLD_LOG_FILE;
try {
    const { app } = require('electron');
    const userData = app.getPath('userData');
    LOG_FILE = path.join(userData, 'valebook-app.log');
    OLD_LOG_FILE = path.join(userData, 'valebook-app.old.log');
} catch (error) {
    LOG_FILE = path.join(__dirname, '../../valebook-app.log');
    OLD_LOG_FILE = path.join(__dirname, '../../valebook-app.old.log');
}

const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2MB Kapasite Limiti

let currentSize = 0;
try {
    if (fs.existsSync(LOG_FILE)) {
        currentSize = fs.statSync(LOG_FILE).size;
    }
} catch (e) {}

function rotateLog() {
    try {
        if (fs.existsSync(OLD_LOG_FILE)) {
            fs.unlinkSync(OLD_LOG_FILE); // Daha eski (Yani 4MB'ı geçen) yedeği sil
        }
        if (fs.existsSync(LOG_FILE)) {
            fs.renameSync(LOG_FILE, OLD_LOG_FILE); // Güncel logu yedeğe al ve temiz bir sayfa başlat
        }
        currentSize = 0;
    } catch (e) {
        console.error('Log rotation failed:', e);
    }
}

function formatMeta(meta) {
    if (!meta || Object.keys(meta).length === 0) return '';
    try {
        const str = JSON.stringify(meta);
        if (str === '{}') return '';
        return ` | Payload: ${str}`;
    } catch (e) {
        return ' | [Unserializable Payload]';
    }
}

function log(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = formatMeta(meta);
    const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
    
    // Geliştirici ortamı için konsola da yansıtıyoruz
    console.log(logLine.trim());

    const byteLen = Buffer.byteLength(logLine, 'utf8');
    
    // Log dosyası 2 MB sınırına dayanırsa güvenle döngüye sok (rotate), sistemi şişirme
    if (currentSize + byteLen >= MAX_LOG_SIZE) rotateLog();

    try {
        fs.appendFileSync(LOG_FILE, logLine);
        currentSize += byteLen;
    } catch (e) {
        console.error('Sisteme Log yazılamadı:', e);
    }
}

module.exports = {
    info: (msg, meta) => log('info', msg, meta),
    warn: (msg, meta) => log('warn', msg, meta),
    error: (msg, meta = {}, errorObj = null) => {
        if (errorObj && errorObj.stack) {
            meta.stack = errorObj.stack;
        } else if (meta instanceof Error) {
            meta = { stack: meta.stack };
        }
        log('error', msg, meta);
    },
    LOG_FILE,
    OLD_LOG_FILE
};
