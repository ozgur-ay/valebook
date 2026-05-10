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

        // Bypassing electron-updater cache directly via GitHub Tags API
        const response = await fetch('https://api.github.com/repos/ozgur-ay/valebook/tags');
        const tags = await response.json();
        
        let latestVersion = pkg.version;
        if (Array.isArray(tags) && tags.length > 0) {
            // Semantik versiyon sorting (v1.1.30 > v1.1.9)
            const sortedTags = tags
                .map(t => t.name.replace('v', ''))
                .sort((a, b) => {
                    const partsA = a.split('.').map(Number);
                    const partsB = b.split('.').map(Number);
                    for (let i = 0; i < 3; i++) {
                        if (partsA[i] > partsB[i]) return -1;
                        if (partsA[i] < partsB[i]) return 1;
                    }
                    return 0;
                });
            latestVersion = sortedTags[0];
        }

        // Versiyon karşılaştırma
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
            // Since autoDownload is now TRUE in main.js, we just need to trigger a check.
            // It will see the newer version, download it, and main.js will show the Restart popup.
            autoUpdater.checkForUpdates().catch(e => console.error("Manual check error:", e));
            return res.json({ success: true, log: "Manual check triggered (result in main process)." });
        }
        res.status(400).json({ error: "Güncelleyici bulunamadı (Electron ortamı değil)." });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
