import remoteMain from '@electron/remote/main/index.js'

import { Menu } from 'electron'
import contextMenu from 'electron-context-menu'

import menuTemplate from '../menu.js'
import { handleAppEvents } from './events.js'
import { registerGlobalShortcuts, unregisterAllShortcuts } from './shortcuts.js'
import { AppUpdater } from './updater.js'
import { createMainWindow } from './window.js'

// Initialize context menu
contextMenu()

// Initialize @electron/remote
remoteMain.initialize()

// Set application menu
Menu.setApplicationMenu(menuTemplate)

// Initialize AppUpdater
void new AppUpdater()

// Handle app lifecycle events
handleAppEvents(createMainWindow, registerGlobalShortcuts, unregisterAllShortcuts)
