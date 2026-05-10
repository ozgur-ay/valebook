const { app, BrowserWindow, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Express sunucusunu başlatıyoruz.
// İçinde yer alan 'open' (tarayıcı açma) paketi electron içindeysek engellendi.
require('./server.js');

let mainWindow;

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
    // Varsayılan port server.js'te 3000
    mainWindow.loadURL('http://localhost:3000');
    
    // Tam ekran başlat
    mainWindow.maximize();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

function initAutoUpdater() {
    // Arka planda indirmeyi aktif ediyoruz, bu daha stabil bir yöntemdir.
    autoUpdater.autoDownload = true;

    autoUpdater.on('checking-for-update', () => {
        console.log('Güncelleme kontrol ediliyor...');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('Yeni güncelleme bulundu:', info.version);
        // İndirme otomatik başladığı için burada sadece logluyoruz.
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('Güncelleme yok.');
    });

    autoUpdater.on('error', (err) => {
        console.error('Güncelleyici hatası:', err);
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('Güncelleme indirildi:', info.version);
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

    // Program her açıldığında kontrol et
    autoUpdater.checkForUpdates();
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
