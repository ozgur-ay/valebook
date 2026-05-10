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

router.get('/check', async (req, res) => {
    try {
        if (!autoUpdater) {
            return res.json({ available: false, current: pkg.version });
        }

        const result = await autoUpdater.checkForUpdates();
        const latestVersion = result && result.updateInfo ? result.updateInfo.version : pkg.version;
        // Eğer GitHub'daki sürüm paket sürümünden farklıysa (yüksekse)
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
            autoUpdater.quitAndInstall(false, true); // (isSilent, isForceRunAfter)
            return res.json({ success: true, log: "Electron autoUpdater triggered quitAndInstall." });
        }
        res.status(400).json({ error: "Güncelleyici bulunamadı (Electron ortamı değil)." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
