const { contextBridge, ipcRenderer } = require('electron')

// Minimal, safe bridge between the main process and the glass UI.
contextBridge.exposeInMainWorld('overlayAPI', {
  onData: (cb) => ipcRenderer.on('metrics', (_e, data) => cb(data)),
  onError: (cb) => ipcRenderer.on('metrics-error', (_e, msg) => cb(msg)),
  onLoading: (cb) => ipcRenderer.on('metrics-loading', () => cb()),
  refresh: () => ipcRenderer.send('refresh'),
  resize: (width, height) => ipcRenderer.send('resize', { width, height }),
  setFilter: (filter) => ipcRenderer.send('set-filter', filter),
  openLink: (url) => ipcRenderer.send('open-link', url),
  close: () => ipcRenderer.send('close')
})
