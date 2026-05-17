const { app, BrowserWindow, dialog, shell, ipcMain, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

const logger = require('./src/utils/logger.js');

// Global Error Logging
process.on('uncaughtException', (err) => {
    logger.error('CRITICAL UNCAUGHT EXCEPTION', {}, err);
    console.error('Critical Error (Logged):', err);
});

process.on('unhandledRejection', (reason, promise) => {
    if (reason instanceof Error) {
        logger.error('UNHANDLED PROMISE REJECTION', {}, reason);
    } else {
        logger.error('UNHANDLED PROMISE REJECTION', { reason });
    }
    console.error('Unhandled Promise Rejection (Logged):', reason);
});

// Express sunucu
require('./server.js');

// Uygulama tekil kilit mekanizması
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    let mainWindow;
    let updaterState = { type: 'idle' };
    let updateChecked = false;

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

        mainWindow.setMenuBarVisibility(false);
        mainWindow.loadURL('http://localhost:3000');
        
        mainWindow.webContents.on('did-finish-load', () => {
            if (typeof onPageLoad === 'function') onPageLoad(mainWindow);
        });

        mainWindow.maximize();
        mainWindow.on('closed', function () {
            mainWindow = null;
        });
    }

    function onPageLoad(window) {
        if (!updateChecked) {
            updateChecked = true;
            const { checkUpdateViaTags } = require('./src/updater-core.js');
            setTimeout(() => {
                checkUpdateViaTags(window, true).then(result => {
                    if (result) updaterState = result;
                });
            }, 5000); // 5 saniye bekle ki arayüz tam otursun
        }
    }

    function initAutoUpdater() {
        autoUpdater.autoDownload = true; 
        autoUpdater.on('error', (err) => {
            if (err.message && err.message.includes('latest.yml')) return;
            updaterState = { type: 'error', message: err.message };
            if (mainWindow) mainWindow.webContents.send('update-status', updaterState);
        });
        ipcMain.handle('get-update-status', () => updaterState);
        ipcMain.on('trigger-manual-check', () => {
            const { checkUpdateViaTags } = require('./src/updater-core.js');
            checkUpdateViaTags(mainWindow).then(result => {
                if (result && result.type === 'available') autoUpdater.checkForUpdates();
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
}
