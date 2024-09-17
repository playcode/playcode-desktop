// src/main/events.ts
import { BrowserWindow, Event as ElectronEvent, app } from 'electron'

import appConfig from '../config.js'

interface CreateWindowFn {
  (): BrowserWindow
}

interface RegisterShortcutsFn {
  (getMainWindow: () => BrowserWindow | null): void
}

interface UnregisterShortcutsFn {
  (): void
}

function handleAppEvents(
  createWindow: CreateWindowFn,
  registerShortcuts: RegisterShortcutsFn,
  unregisterShortcuts: UnregisterShortcutsFn,
) {
  let mainWindow: BrowserWindow | null = null
  let isQuitting = false

  // App ready event
  app.on('ready', () => {
    mainWindow = createWindow()

    // Register global shortcuts
    registerShortcuts(() => mainWindow)

    // Additional setup if needed
    // Handle window close events
    mainWindow.on('close', (e: ElectronEvent) => {
      if (!isQuitting) {
        // Assuming you set app.quitting elsewhere
        e.preventDefault()
        if (process.platform === 'darwin') {
          app.hide()
        } else {
          app.quit()
        }
      }
    })
  })

  // Handle all windows closed
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Handle app activation (macOS)
  app.on('activate', () => {
    if (mainWindow) {
      mainWindow.show()
    } else {
      mainWindow = createWindow()
    }
  })

  // Handle before-quit to set the quitting flag and save window state
  app.on('before-quit', () => {
    isQuitting = true

    if (mainWindow && !mainWindow.isFullScreen()) {
      appConfig.set('lastWindowState', mainWindow.getBounds())
    }
  })

  // Handle will-quit to unregister all global shortcuts
  app.on('will-quit', () => {
    unregisterShortcuts()
  })
}

export { handleAppEvents }
