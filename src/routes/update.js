const express = require('express');
const router = express.Router();
const { checkUpdate, installUpdate } = require('../utils/updater');
const pkg = require('../../package.json');

/**
 * Güncelleme API rotaları.
 */

router.get('/check', async (req, res) => {
    try {
        const result = await checkUpdate(pkg.version);
        res.json({
            current: pkg.version,
            ...result
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/install', async (req, res) => {
    try {
        const result = await installUpdate();
        res.json({ success: true, log: result.stdout });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
