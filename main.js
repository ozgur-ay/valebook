const { app, BrowserWindow } = require('electron');
const path = require('path');

// Express sunucusunu başlatıyoruz.
// İçinde yer alan 'open' (tarayıcı açma) paketi electron içindeysek engellendi.
require('./server.js');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: "ValeBook",
        // icon: path.join(__dirname, 'build', 'icon.ico'), // İkonu sonra ekleyeceğiz
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

app.on('ready', () => {
    createWindow();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
