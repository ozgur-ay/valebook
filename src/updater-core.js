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
        
        // Tags yerine doğrudan Releases/Latest endpointini kullanıyoruz (Sadece asset olanları görür)
        const response = await fetch('https://api.github.com/repos/ozgur-ay/valebook/releases/latest');
        
        if (!response.ok) {
            const noRel = { type: 'not-available' };
            mainWindow.webContents.send('update-status', noRel);
            return noRel;
        }

        const release = await response.json();
        const latestTag = release.tag_name.replace('v', '');
        const currentVersion = pkg.version;

        const isNewer = isVersionNewer(latestTag, currentVersion);

        // Asset kontrolü: Gerçekten bir .exe var mı?
        const exeAsset = release.assets.find(a => a.name.endsWith('.exe'));

        if (isNewer && exeAsset) {
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
                        const downloadUrl = exeAsset.browser_download_url;
                        
                        const https = require('https');
                        const fs = require('fs');
                        const path = require('path');
                        const { app } = require('electron');
                        
                        const tempPath = path.join(app.getPath('temp'), `valebook_update_setup.exe`);
                        const file = fs.createWriteStream(tempPath);
                        
                        const handleDownload = (url) => {
                            https.get(url, {
                                headers: { 'User-Agent': 'ValeBook' }
                            }, (response) => {
                                if (response.statusCode === 301 || response.statusCode === 302) {
                                    handleDownload(response.headers.location);
                                    return;
                                }
                                
                                const totalBytes = parseInt(response.headers['content-length'], 10);
                                let receivedBytes = 0;
                                
                                response.on('data', (chunk) => {
                                    receivedBytes += chunk.length;
                                    if (totalBytes) {
                                        const percent = Math.floor((receivedBytes / totalBytes) * 100);
                                        mainWindow.webContents.send('update-status', { type: 'progress', percent: percent });
                                    }
                                });
                                
                                response.pipe(file);
                                
                                file.on('finish', () => {
                                    file.close();
                                    mainWindow.webContents.send('update-status', { type: 'downloaded' });
                                    setTimeout(() => {
                                        const { spawn } = require('child_process');
                                        spawn(tempPath, [], { 
                                            detached: true, 
                                            stdio: 'ignore',
                                            shell: false 
                                        }).unref();
                                        app.quit();
                                    }, 2000);
                                });
                            }).on('error', (err) => {
                                fs.unlink(tempPath, () => {});
                                mainWindow.webContents.send('update-status', { type: 'error', message: 'İndirme hatası: ' + err.message });
                            });
                        };
                        
                        handleDownload(downloadUrl);
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
        console.error('Release based update check failed:', error);
        const errorState = { type: 'error', message: 'Güncelleme kontrolü başarısız oldu.' };
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
