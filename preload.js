const { contextBridge, ipcRenderer } = require('electron');

// Exposición segura de utilidades nativas al Renderer mediante contextBridge
contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: '1.0.0',
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body })
});
