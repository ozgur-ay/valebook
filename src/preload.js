const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: (filePath) => ipcRenderer.send('open-file', filePath),
    onUpdateStatus: (callback) => ipcRenderer.on('update-status', (event, ...args) => callback(...args))
});
