const { app, BrowserWindow, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

// Global Error Logging - Save errors before app crashes
process.on('uncaughtException', (err) => {
    const errorLogPath = path.join(__dirname, 'valebook-error.log');
    const logMessage = `\n[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${err.message}\n${err.stack}`;
    fs.appendFileSync(errorLogPath, logMessage);
    console.error('Critical Error (Logged):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    const errorLogPath = path.join(__dirname, 'valebook-error.log');
    const logMessage = `\n[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`;
    fs.appendFileSync(errorLogPath, logMessage);
    console.error('Unhandled Promise Rejection (Logged):', reason);
});

// Express sunucusunu başlatıyoruz.
// İçinde yer alan 'open' (tarayıcı açma) paketi electron içindeysek engellendi.
require('./server.js');

// Uygulama tekil kilit mekanizması (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Eğer kilit alınamadıysa zaten bir kopya çalışıyordur.
    console.log('Uygulama zaten açık. İkinci kopya kapatılıyor.');
    
    // Uygulama henüz 'ready' olmadan diyalog gösteremeyebiliriz, bu yüzden basit bir hata kutusu kullanıyoruz.
    dialog.showErrorBox(
        'ValeBook Zaten Çalışıyor',
        'Uygulamanın bir kopyası zaten açık. Lütfen çalışan uygulamayı kullanın.'
    );
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Birisi ikinci bir kopya açmaya çalıştığında, ana pencereyi odakla.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow;
    let updaterState = { type: 'idle' };

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "ValeBook",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'src/preload.js')
        }
    });

    // Otomatik Dosya Açma (Download tamamlanınca açar) ve İlerleme Bildirimi
    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        // İndirme penceresini (Save As) engelleyip doğrudan Temp klasörüne kaydet (İzin/Çakışma garantisi)
        const downloadPath = path.join(app.getPath('temp'), `valebook_update_${Date.now()}.exe`);
        item.setSavePath(downloadPath);

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('İndirme kesildi');
                mainWindow.webContents.send('update-status', { type: 'error', message: 'İndirme kesildi.' });
            } else if (state === 'progressing') {
                if (!item.isPaused()) {
                    const percent = Math.floor((item.getReceivedBytes() / item.getTotalBytes()) * 100);
                    mainWindow.webContents.send('update-status', { 
                        type: 'progress', 
                        percent: percent,
                        bytesPerSecond: 0 
                    });
                }
            }
        });
        item.once('done', (event, state) => {
            if (state === 'completed') {
                const filePath = item.getSavePath();
                console.log('İndirme tamamlandı:', filePath);
                mainWindow.webContents.send('update-status', { type: 'downloaded' });
                
                // Kapamadan önce kullanıcıya bilgi vereceksek diye ufak bekleme
                setTimeout(() => {
                    shell.openPath(filePath);
                }, 1000);
            } else {
                console.log(`İndirme başarısız: ${state}`);
                mainWindow.webContents.send('update-status', { type: 'error', message: 'İndirme başarısız oldu.' });
            }
        });
    });

    // Menü çubuğunu gizle
    mainWindow.setMenuBarVisibility(false);

    // Kendi sunucumuzu yükle
    mainWindow.loadURL('http://localhost:3000');
    
    // Sayfa yüklendiğinde güncellemeleri kontrol et (Tag-based otonom check + Pop-up)
    mainWindow.webContents.on('did-finish-load', () => {
        const { checkUpdateViaTags } = require('./src/updater-core.js');
        checkUpdateViaTags(mainWindow, true).then(result => {
            if (result) updaterState = result;
        });
    });

    mainWindow.maximize();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function initAutoUpdater() {
    // Arka planda indirmeyi aktif ediyoruz (Daha stabil ve hızlı aksiyon sağlar)
    autoUpdater.autoDownload = true; 

    autoUpdater.on('checking-for-update', () => {
        console.log('Güncelleme kontrol ediliyor...');
        updaterState = { type: 'checking' };
        if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Yeni güncelleme bulundu:', info.version);
        updaterState = { type: 'available', version: info.version };
        if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
        // autoDownload true olduğu için burada tekrar download tetiklemeye gerek yok.
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('Güncelleme yok.');
        updaterState = { type: 'not-available' };
        if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
    });

    autoUpdater.on('error', (err) => {
        console.error('Güncelleyici hatası:', err);
        // latest.yml hatasını renderer'a gönderme (kullanıcıyı korkutmamak için)
        if (err.message && err.message.includes('latest.yml')) {
            console.log('latest.yml bulunamadı hatası sessize alındı.');
            return;
        }
        updaterState = { type: 'error', message: err.message };
        if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        updaterState = { 
            type: 'progress', 
            percent: progressObj.percent,
            bytesPerSecond: progressObj.bytesPerSecond
        };
        if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Güncelleme indirildi:', info.version);
        updaterState = { type: 'downloaded', version: info.version };
        if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'ValeBook Güncelleme',
            message: `Yeni sürüm (v${info.version}) hazır! Kurulumun tamamlanması için uygulama şimdi kapatılıp yeniden başlatılacak.`,
            buttons: ['Şimdi Güncelle ve Başlat']
        }).then(() => {
            // quitAndInstall çağrısı öncesi tüm pencereleri kapatmaya zorla
            setImmediate(() => autoUpdater.quitAndInstall(false, true));
        });
    });

    // Program her açıldığında kontrol et - Native check devre dışı (latest.yml 404 hatasını önlemek için)
    // autoUpdater.checkForUpdates();

    // Renderer'dan gelen durum isteklerini cevapla
    ipcMain.handle('get-update-status', () => {
        return updaterState;
    });

    // Manuel kontrol isteğini karşıla
    ipcMain.on('trigger-manual-check', () => {
        const { checkUpdateViaTags } = require('./src/updater-core.js');
        checkUpdateViaTags(mainWindow).then(result => {
            if (result && result.type === 'available') {
                autoUpdater.checkForUpdates();
            }
        });
    });
}

app.on('ready', () => {
    createWindow();
    initAutoUpdater();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
} // <--- Single instance else bloğu burada kapanıyor v1.1.80
