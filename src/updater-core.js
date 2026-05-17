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
                        
                        // İndirmeyi webContents yerine Native Node.js Sockets ile yapıyoruz (SmartScreen MotW Atlatması)
                        const https = require('https');
                        const fs = require('fs');
                        const path = require('path');
                        const { app, shell } = require('electron');
                        
                        const tempPath = path.join(app.getPath('temp'), `valebook_update_silent.exe`);
                        const file = fs.createWriteStream(tempPath);
                        
                        const handleDownload = (url) => {
                            https.get(url, (response) => {
                                // GitHub Redirect Handle
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
                                        mainWindow.webContents.send('update-status', { type: 'progress', percent: percent, bytesPerSecond: 0 });
                                    }
                                });
                                
                                response.pipe(file);
                                
                                file.on('finish', () => {
                                    file.close();
                                    mainWindow.webContents.send('update-status', { type: 'downloaded' });
                                    setTimeout(() => {
                                        const { spawn } = require('child_process');
                                        // shell: true ve windowsHide: true ile SmartScreen'in 'shell' üzerinden yakalamasını zorlaştırıyoruz
                                        spawn(tempPath, [], { 
                                            detached: true, 
                                            stdio: 'ignore',
                                            shell: false // Doğrudan dosya yoluyla çalıştırmak bazen daha sessizdir
                                        }).unref();
                                        app.quit();
                                    }, 2000);
                                });
                            }).on('error', (err) => {
                                fs.unlink(tempPath, () => {});
                                mainWindow.webContents.send('update-status', { type: 'error', message: 'İndirme uç noktası hatası: ' + err.message });
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
