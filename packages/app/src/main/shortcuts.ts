// src/main/shortcuts.ts
import { BrowserWindow, globalShortcut } from 'electron'

import screenRecorder from '../utils/screen-recorder.js'

function registerGlobalShortcuts(getMainWindow: () => BrowserWindow | null) {
  // Reload shortcut
  globalShortcut.register('CmdOrCtrl+R', () => {
    const mainWindow = getMainWindow()
    mainWindow?.webContents.reload()
  })

  // Register screen recorder global shortcuts
  screenRecorder.registerGlobalShortcut(() => getMainWindow() as BrowserWindow)
}

function unregisterAllShortcuts() {
  globalShortcut.unregisterAll()
}

export { registerGlobalShortcuts, unregisterAllShortcuts }
