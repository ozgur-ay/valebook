const { app, BrowserWindow, dialog } = require('electron');
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
            contextIsolation: true
        }
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
    // Otomatik indirmeyi durdur, kullanıcıya biz soracağız.
    autoUpdater.autoDownload = false;

    autoUpdater.on('update-available', (info) => {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Yeni Güncelleme Mevcut!',
            message: `ValeBook'un yeni bir sürümü (v${info.version}) yayınlanmış.\n\nGüncellemeyi şimdi indirip kurmak ister misiniz?`,
            buttons: ['Evet, Güncelle', 'Daha Sonra']
        }).then((result) => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Güncelleme Hazır',
            message: 'Güncelleme başarıyla indirildi. Kurulum için program yeniden başlatılacak.',
            buttons: ['Tamam, Yeniden Başlat']
        }).then(() => {
            autoUpdater.quitAndInstall(false, true);
        });
    });

    // Program her açıldığında fark ettirmeden güncellemeleri kontrol et
    autoUpdater.checkForUpdates().catch(err => {
        console.warn("Açılışta güncelleme denetimi başarısız:", err.message);
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
