import remoteMain from '@electron/remote/main/index.js'

import { BrowserWindow, Event as ElectronEvent, Menu, WebContents, app, shell } from 'electron'

import fs from 'fs'
import path from 'path'

import appConfig from '../config.js'
import { AppUpdater } from './updater.js'

const isDev = !app.isPackaged
const appTitle: string = app.getName()

export function createMainWindow(): BrowserWindow {
  const lastWindowState = appConfig.get('lastWindowState')

  const appView = new BrowserWindow({
    title: appTitle,
    x: lastWindowState?.x,
    y: lastWindowState?.y,
    width: lastWindowState?.width || 1024,
    height: lastWindowState?.height || 800,
    backgroundColor: '#15222e',
    transparent: process.platform !== 'linux',
    frame: process.platform === 'linux',
    center: true,
    movable: true,
    resizable: true,
    fullscreenable: true,
    webPreferences: {
      // Maybe other day we will add whitelist for preload
      // preload: path.join(app.getAppPath(), '../preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      // If you need to enable remote module, ensure it's handled securely
      // enableRemoteModule: true, // Deprecated in newer Electron versions
    },
  })

  // Enable @electron/remote
  remoteMain.enable(appView.webContents)

  // Load the appropriate URL based on the environment
  if (isDev) {
    void appView.loadURL('http://localhost:8000/new')
    // Alternatively, you can load other development URLs as needed
    // appView.loadURL('http://localhost:7000/new');
    // appView.loadURL('https://playcode.io/new');
    // appView.loadURL(`file://${__dirname}/dist/index.html`);
  } else {
    void appView.loadURL('https://playcode.io/new')
  }

  // Initialize the app updater
  // eslint-disable-next-line no-new
  new AppUpdater(appView)

  // Handle fullscreen events
  appView.on('enter-full-screen', () => {
    void appView.webContents.executeJavaScript(`document.dispatchEvent(new Event("electronEnteredFullscreen"));`)
  })

  appView.on('leave-full-screen', () => {
    void appView.webContents.executeJavaScript(`document.dispatchEvent(new Event("electronLeavedFullscreen"));`)
  })

  // Open DevTools if in development mode
  if (isDev) {
    appView.webContents.openDevTools()
  }

  const appPage: WebContents = appView.webContents

  // Handle DOM ready event
  appPage.on('dom-ready', () => {
    const version = app.getVersion()

    // Dispatch a custom event with the Electron version
    void appPage.executeJavaScript(
      `document.dispatchEvent(new CustomEvent('setElectronVersion', { detail: { version: '${version}' } }));`,
    )

    // Insert global CSS
    const appCSSPath = path.join(app.getAppPath(), '../../../renderer/app.css')
    const appCSS = fs.readFileSync(appCSSPath, 'utf8')
    void appPage.insertCSS(appCSS)

    // Execute global JavaScript
    const rendererJSPath = path.join(app.getAppPath(), '../../../renderer/renderer.js')
    const rendererJS = fs.readFileSync(rendererJSPath, 'utf8')
    void appPage.executeJavaScript(rendererJS)

    // Show the main window
    appView.show()

    // Handle new window events (e.g., window.open)
    appPage.setWindowOpenHandler(({ url }) => {
      const hostname = new URL(url).hostname.toLowerCase()

      // Allow accounts.google.com to handle itself
      if (hostname.includes('accounts.google.com')) {
        return { action: 'deny' }
      }

      const isPreview = hostname.startsWith('preview-')

      if (isPreview) {
        // Allow opening the URL in a new BrowserWindow
        const newWin = new BrowserWindow({
          show: false,
          webPreferences: {
            // preload: path.join(__dirname, '../preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
          },
        })

        newWin.once('ready-to-show', () => {
          newWin.show()
        })

        void newWin.loadURL(url)

        // Optionally open DevTools for preview windows
        if (isDev) {
          newWin.webContents.openDevTools()
        }

        return { action: 'allow', overrideBrowserWindowOptions: { parent: appView } }
      }

      // Open external links in the default browser
      void shell.openExternal(url)
      return { action: 'deny' }
    })
  })

  // Handle app-command events (e.g., back button on mouse)
  appView.on('app-command', (e: ElectronEvent, cmd: string) => {
    if (cmd === 'browser-backward' && appView.webContents.canGoBack()) {
      appView.webContents.goBack()
    }
  })

  return appView
}
