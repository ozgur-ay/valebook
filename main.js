const { app, BrowserWindow, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Express sunucusunu başlatıyoruz.
// İçinde yer alan 'open' (tarayıcı açma) paketi electron içindeysek engellendi.
require('./server.js');

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

    // Otomatik Dosya Açma (Download tamamlanınca açar)
    session.defaultSession.on('will-download', (event, item, webContents) => {
        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('İndirme kesildi');
            }
        });
        item.once('done', (event, state) => {
            if (state === 'completed') {
                const filePath = item.getSavePath();
                console.log('İndirme tamamlandı:', filePath);
                shell.openPath(filePath);
            } else {
                console.log(`İndirme başarısız: ${state}`);
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
        checkUpdateViaTags(mainWindow, true);
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
        checkUpdateViaTags(mainWindow);
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
