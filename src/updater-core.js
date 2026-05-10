const { autoUpdater } = require('electron-updater');
const pkg = require('../package.json');

/**
 * GitHub Tags API kullanarak versiyon kontrolü yapar.
 * latest.yml gereksinimini (404 hatası) ortadan kaldırır.
 */
async function checkUpdateViaTags(mainWindow) {
    if (!mainWindow) return;
    
    try {
        mainWindow.webContents.send('update-status', { type: 'checking' });
        
        const response = await fetch('https://api.github.com/repos/ozgur-ay/valebook/tags');
        const tags = await response.json();
        
        if (!Array.isArray(tags) || tags.length === 0) {
            mainWindow.webContents.send('update-status', { type: 'not-available' });
            return;
        }

        const latestTag = tags[0].name.replace('v', '');
        const currentVersion = pkg.version;

        // Semantik Karşılaştırma
        const isNewer = isVersionNewer(latestTag, currentVersion);

        if (isNewer) {
            mainWindow.webContents.send('update-status', { 
                type: 'available', 
                version: latestTag 
            });
        } else {
            mainWindow.webContents.send('update-status', { type: 'not-available' });
        }
    } catch (error) {
        console.error('Tag based update check failed:', error);
        mainWindow.webContents.send('update-status', { 
            type: 'error', 
            message: 'Güncelleme kontrolü başarısız oldu (GitHub API).' 
        });
    }
}

function isVersionNewer(latest, current) {
    const l = latest.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (l[i] > c[i]) return true;
        if (l[i] < c[i]) return false;
    }
    return false;
}

module.exports = { checkUpdateViaTags };
