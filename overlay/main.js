const { app, BrowserWindow, ipcMain, screen, shell } = require('electron')
const path = require('path')
const { fetchMetrics, fetchUniverse } = require('./linear')

const REFRESH_MS = 3 * 60 * 1000 // auto-refresh every 3 minutes
const UNIVERSE_TTL = 5 * 60 * 1000 // re-scan the label/team universe at most this often
let win = null
let currentFilter = {} // { teams?, priorities?, labels? } — set by the renderer
let universe = { allLabels: [], teams: [] }
let universeAt = 0
let fetching = false
let pending = false

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay()
  const width = 400
  const height = 168

  win = new BrowserWindow({
    width,
    height,
    x: workArea.x + workArea.width - width - 24,
    y: workArea.y + 24,
    frame: false,
    transparent: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Float above normal windows and follow across spaces / fullscreen apps.
  win.setAlwaysOnTop(true, 'floating')
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.loadFile(path.join(__dirname, 'renderer.html'))
}

async function refresh() {
  if (!win) return
  if (fetching) { pending = true; return } // coalesce overlapping requests
  fetching = true
  win.webContents.send('metrics-loading')
  try {
    const metrics = await fetchMetrics(currentFilter)
    // Refresh the pickers' universe only when stale (it's the expensive full scan).
    if (Date.now() - universeAt > UNIVERSE_TTL) {
      try { universe = await fetchUniverse(); universeAt = Date.now() } catch { /* keep last universe */ }
    }
    const payload = { ...metrics, allLabels: universe.allLabels, teams: universe.teams }
    if (win) win.webContents.send('metrics', payload)
  } catch (err) {
    if (win) win.webContents.send('metrics-error', err && err.message ? err.message : 'Fetch failed')
  } finally {
    fetching = false
    if (pending) { pending = false; setTimeout(refresh, 50) } // run the latest requested state once
  }
}

app.whenReady().then(() => {
  if (app.dock) app.dock.hide() // pure overlay — no dock icon
  createWindow()
  // First fetch is kicked off by the renderer sending its saved filter (setFilter).
  setInterval(refresh, REFRESH_MS)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

ipcMain.on('refresh', refresh)
ipcMain.on('close', () => app.quit())

// Renderer sets/changes the active filter; recompute the numbers for it.
ipcMain.on('set-filter', (_e, filter) => {
  currentFilter = filter && typeof filter === 'object' ? filter : {}
  refresh()
})

// Open a box's issues in Linear (validated to linear.app only).
ipcMain.on('open-link', (_e, url) => {
  if (typeof url === 'string' && /^https:\/\/linear\.app\//.test(url)) shell.openExternal(url)
})

// Renderer asks to resize as the number of visible boxes changes (or when the
// settings panel opens). Keep the current top-left anchor so it stays put.
ipcMain.on('resize', (_e, size) => {
  if (!win || !size) return
  const b = win.getBounds()
  const width = Math.max(200, Math.min(760, Math.round(size.width)))
  const height = Math.max(140, Math.min(520, Math.round(size.height)))
  win.setBounds({ x: b.x, y: b.y, width, height })
})

app.on('window-all-closed', () => app.quit())
