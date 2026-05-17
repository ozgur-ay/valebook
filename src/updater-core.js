const { autoUpdater } = require('electron-updater');
const pkg = require('../package.json');

/**
 * Release-based Auto Update Engine (Zero-Click)
 */
async function checkUpdateViaTags(mainWindow, autoDownload = true) {
    if (!mainWindow) return;
    
    try {
        mainWindow.webContents.send('update-status', { type: 'checking' });
        
        // GitHub API call with User-Agent
        const response = await fetch('https://api.github.com/repos/ozgur-ay/valebook/releases/latest', {
            headers: { 'User-Agent': 'ValeBook-Updater' }
        });
        
        if (!response.ok) {
            mainWindow.webContents.send('update-status', { type: 'not-available' });
            return;
        }

        const release = await response.json();
        const latestTag = release.tag_name.replace('v', '');
        const currentVersion = pkg.version;

        const isNewer = isVersionNewer(latestTag, currentVersion);
        const exeAsset = release.assets.find(a => a.name.endsWith('.exe'));

        if (isNewer && exeAsset) {
            mainWindow.webContents.send('update-status', { 
                type: 'available', 
                version: latestTag 
            });

            // ZERO-CLICK AUTO DOWNLOAD
            if (autoDownload) {
                startDownload(mainWindow, exeAsset.browser_download_url);
            }
            
            return { type: 'available', version: latestTag };
        } else {
            mainWindow.webContents.send('update-status', { type: 'not-available' });
        }
    } catch (error) {
        console.error('[Updater Error]:', error);
        mainWindow.webContents.send('update-status', { type: 'error', message: error.message });
    }
}

function startDownload(mainWindow, downloadUrl) {
    const https = require('https');
    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');
    
    const tempPath = path.join(app.getPath('temp'), `valebook_update_setup.exe`);
    const file = fs.createWriteStream(tempPath);
    
    mainWindow.webContents.send('update-status', { type: 'progress', percent: 1 });

    const handleDownload = (url) => {
        https.get(url, {
            headers: { 'User-Agent': 'ValeBook-Downloader' }
        }, (response) => {
            // Handle redirects (GitHub assets often redirect to S3/Azure)
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
                
                // Kurulumu başlat ve kapat
                setTimeout(() => {
                    const { spawn } = require('child_process');
                    spawn(tempPath, [], { 
                        detached: true, 
                        stdio: 'ignore',
                        shell: false 
                    }).unref();
                    app.quit();
                }, 1500);
            });
        }).on('error', (err) => {
            fs.unlink(tempPath, () => {});
            mainWindow.webContents.send('update-status', { type: 'error', message: err.message });
        });
    };
    
    handleDownload(downloadUrl);
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
