const { autoUpdater } = require('electron-updater');
const pkg = require('../package.json');

/**
 * GitHub Tags API kullanarak versiyon kontrolü yapar.
 * latest.yml gereksinimini (404 hatası) ortadan kaldırır.
 */
async function checkUpdateViaTags(mainWindow, showDialog = false) {
    if (!mainWindow) return;
    
    try {
        mainWindow.webContents.send('update-status', { type: 'checking' });
        
        const response = await fetch('https://api.github.com/repos/ozgur-ay/valebook/tags');
        const tags = await response.json();
        
        if (!Array.isArray(tags) || tags.length === 0) {
            const noTags = { type: 'not-available' };
            mainWindow.webContents.send('update-status', noTags);
            return noTags;
        }

        const latestTag = tags[0].name.replace('v', '');
        const currentVersion = pkg.version;

        const isNewer = isVersionNewer(latestTag, currentVersion);

        if (isNewer) {
            mainWindow.webContents.send('update-status', { 
                type: 'available', 
                version: latestTag 
            });

            if (showDialog) {
                const { dialog } = require('electron');
                dialog.showMessageBox(mainWindow, {
                    type: 'info',
                    title: 'Yeni Güncelleme Mevcut',
                    message: `Yeni bir ValeBook sürümü (v${latestTag}) mevcut! Şimdi indirip kurmak ister misiniz?`,
                    buttons: ['Evet, Şimdi İndir ve Kur', 'Daha Sonra']
                }).then((result) => {
                    if (result.response === 0) {
                        const downloadUrl = `https://github.com/ozgur-ay/valebook/releases/download/v${latestTag}/ValeBook-Setup-${latestTag}.exe`;
                        mainWindow.webContents.downloadURL(downloadUrl);
                    }
                });
            }
            return { type: 'available', version: latestTag };
        } else {
            const upToDate = { type: 'not-available' };
            mainWindow.webContents.send('update-status', upToDate);
            return upToDate;
        }
    } catch (error) {
        console.error('Tag based update check failed:', error);
        const errorState = { 
            type: 'error', 
            message: 'Güncelleme kontrolü başarısız oldu (GitHub API).' 
        };
        mainWindow.webContents.send('update-status', errorState);
        return errorState;
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
