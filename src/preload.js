const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: (filePath) => ipcRenderer.send('open-file', filePath)
});
