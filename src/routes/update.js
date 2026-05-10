const express = require('express');
const router = express.Router();
const pkg = require('../../package.json');

let autoUpdater;
try {
    if (process.versions && process.versions.electron) {
        autoUpdater = require('electron-updater').autoUpdater;
        // Sessiz (arka planda) güncellemeyi otomatik indirmesi için:
        autoUpdater.autoDownload = true; 
    }
} catch (e) {
    console.warn("Electron ortamı bulunamadı, autoUpdater devre dışı.");
}

router.get('/version', (req, res) => {
    res.json({ current: pkg.version });
});

router.get('/check', async (req, res) => {
    try {
        if (!autoUpdater) {
            return res.json({ available: false, current: pkg.version });
        }

        // Bypassing electron-updater cache directly via GitHub API
        const response = await fetch('https://api.github.com/repos/ozgur-ay/valebook/releases/latest');
        const data = await response.json();
        
        let latestVersion = pkg.version;
        if (data && data.tag_name) {
            latestVersion = data.tag_name.replace('v', '');
        }

        const isNewer = latestVersion !== pkg.version;
        res.json({
            available: isNewer,
            current: pkg.version,
            latestVersion: latestVersion
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/install', async (req, res) => {
    try {
        if (autoUpdater) {
            // Because autoDownload is disabled in main.js, we MUST trigger the download explicitly first.
            // main.js will catch the 'update-downloaded' event and display the native prompt to Restart.
            autoUpdater.downloadUpdate().catch(e => console.error("Download update error:", e));
            return res.json({ success: true, log: "Electron autoUpdater triggered downloadUpdate." });
        }
        res.status(400).json({ error: "Güncelleyici bulunamadı (Electron ortamı değil)." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
