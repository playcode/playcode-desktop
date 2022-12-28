// System paths
const path = require('path')
const fs = require('fs')

// Electron
const electron = require('electron')
const {ipcMain} = require('electron')
const logger = require("electron-log")

const globalShortcut = electron.globalShortcut
const menu = electron.Menu

// App Info
const app = electron.app

const appTitle = app.getName()
const appConfig = require('./lib/config.js')

const appIsDev = require('electron-is-dev')

// Right Click/Context menu contents
require('electron-context-menu')()

// Main App Window
let mainWindow

// If the application is quitting
let isQuitting = false

class AppUpdater {
  constructor() {
    const { autoUpdater } = require("electron-updater")

    logger.transports.file.level = "info"
    logger.transports.console.level = "info"
    autoUpdater.logger = logger
    autoUpdater.disableWebInstaller = true
    autoUpdater.autoInstallOnAppQuit = true
    autoUpdater.on('update-downloaded', async (info) => {
      logger.info('update-downloaded', info)
      const isConfirmed = await mainWindow.webContents.executeJavaScript(
        `confirm('Update downloaded. Restart now?')`
      )
      if (isConfirmed) {
        autoUpdater.quitAndInstall()
      }
    })
    this.checkForUpdates()
  }
  async checkForUpdates() {
    const { autoUpdater } = require("electron-updater")

    await autoUpdater.checkForUpdatesAndNotify({
      title: "Update downloaded. Restart now?",
      body: "",
    })
  }
}

// Main Window
function createMainWindow() {

  const lastWindowState = appConfig.get('lastWindowState')
  
  const remoteMain = require("@electron/remote/main")
  remoteMain.initialize()
  
  const appView = new electron.BrowserWindow({
    title: appTitle,
    x: lastWindowState.x,
    y: lastWindowState.y,
    width: lastWindowState.width || 1024,
    height: lastWindowState.height || 800,
    // titleBarStyle: 'hidden',
    
    backgroundColor: '#15222e',
    transparent: process.platform !== 'linux',
    frame: process.platform === 'linux',

    // backgroundColor: '#2ed3ea',
    // transparent: false,
    // frame: true,
    
    center: true,
    movable: true,
    resizable: true,
    
    fullscreenable: true,
    // autoHideMenuBar: true,

    webPreferences: {
      webSecurity: true,
      nodeIntegration: true,
      // enableRemoteModule: true,
      contextIsolation: false,
      // nativeWindowOpen: true
    }
  })
  
  remoteMain.enable(appView.webContents)
  
  if (appIsDev) {
    // let internal_url = 'https://playcode.io/new';
    //
    // appView.webContents.on('did-start-loading', function(e) {
    //   electron.protocol.interceptBufferProtocol('https', function(request, respond) {
    //     electron.protocol.uninterceptProtocol('https');
    //     console.log('intercepted', request.url);
    //
    //     if (request.url !== internal_url) {
    //       console.warn('something went wrong');
    //     } else {
    //       let content = fs.readFileSync(__dirname + '/dist' + '/index.html');
    //       // console.log(content.toString())
    //       respond(content);
    //     }
    //   });
    // });
    //
    //
    // appView.loadURL(internal_url)
    // appView.loadURL(`peer:///dist/index.html`)
    // appView.loadURL('http://localhost:7000/new')
    // appView.loadURL('http://192.168.1.130:7070/new')
    // appView.loadURL('https://playcode.io/new')
    // appView.loadURL(`file://${__dirname}/dist/index.html`)
    appView.loadURL('http://localhost:7070/new')
    // appView.loadURL('https://playcode.io/new')
  } else {
    appView.loadURL('https://playcode.io/new')
  }
  
  new AppUpdater()

  // When window is closed, hide window on darwin and quit on other platforms
  appView.on('close', e => {
    if (!isQuitting) {
      e.preventDefault()
      if (process.platform === 'darwin') {
        app.hide()
      } else {
        app.quit()
      }
    }
  })
  
  // Enter fullscreen PlayCode fullscreen method execution
  appView.on('enter-full-screen', () => {
    appView.webContents.executeJavaScript('document.dispatchEvent( new Event("electronEnteredFullscreen") );')
  })

  // Exit fullscreen PlayCode fullscreen method execution
  appView.on('leave-full-screen', () => {
    appView.webContents.executeJavaScript('document.dispatchEvent( new Event("electronLeavedFullscreen") );')
  })

  return appView
}

function serveStatic () {
  electron.protocol.registerFileProtocol(
    'peer',
    function(req,callback) {
      // console.log(req)
      // var file_path = __dirname+'/'+req.url.substring('peer://'.length)
      // console.log(file_path)
      // cb({path: file_path})
      // cb(file_path)
  
      console.log('URL', req.url)
      console.log(path.normalize(`${__dirname}/${req.url.substring('peer://'.length)}`))
  
      if (req.url.startsWith('peer://')) {
        callback({ path:  path.normalize(`${__dirname}/${req.url.substring('peer://'.length)}`) });
      } else {
        callback(req);
      }
    })
}

app.on('ready', () => {
  // serveStatic()
  
  const version = app.getVersion()
  
  mainWindow = createMainWindow()

  // Setting App menu
  menu.setApplicationMenu(require('./lib/menu.js'))

  // If running in developer environment = Open developer tools
  if (appIsDev) {
    mainWindow.openDevTools()
  }

  const appPage = mainWindow.webContents
  
  appPage.on('dom-ready', () => {

    // console.log('Updated')

    // Make SetVersion event
    appPage.executeJavaScript(`document.dispatchEvent( new CustomEvent('setElectronVersion', {detail: {version: '${version}'}}) );`)

    // Global Style Additions
    appPage.insertCSS(fs.readFileSync(path.join(__dirname, 'app.css'), 'utf8'))

    // Global Code Additions
    appPage.executeJavaScript(fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8'))

    // Show the Main Window
    mainWindow.show()

    // Open external links in browser
    appPage.on('new-window', (event, url) => {

      const hostname = (new URL(url)).hostname.toLowerCase()
      if (hostname.indexOf('accounts.google.com') !== -1) return
      
      const isPreview = hostname.startsWith('preview-')
      
      if (isPreview) {
        // this should allow open window
        event.preventDefault()

        const win = new electron.BrowserWindow({
          show: false,
        })
        win.once('ready-to-show', () => win.show())
        win.loadURL(url)
        event.newGuest = win

        if (isPreview) {
          win.webContents.openDevTools();
        }

      } else {
        event.preventDefault()
        electron.shell.openExternal(url)
      }

    })

    if (appIsDev) {
      // Shortcut to reload the page.
      globalShortcut.register('CmdOrCtrl+R', (item, focusedWindow) => {
          if (focusedWindow) {
              mainWindow.webContents.reload()
          }
      })
    }
    // Shortcut to go back a page.
    // globalShortcut.register('Command+Left', ( item, focusedWindow ) => {
    //   if ( focusedWindow && focusedWindow.webContents.canGoBack() ) {
    //     focusedWindow.webContents.goBack()
    //     focusedWindow.webContents.reload()
    //   }
    // })

    // Navigate the window back when the user hits their mouse back button
    mainWindow.on('app-command', (e, cmd) => {
      if (cmd === 'browser-backward' && mainWindow.webContents.canGoBack()) {
        mainWindow.webContents.goBack()
      }
    })
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  mainWindow.show()
})

app.on('before-quit', () => {
  isQuitting = true

  // Saves the current window position and window size to the config file.
  if (!mainWindow.isFullScreen()) {
    appConfig.set('lastWindowState', mainWindow.getBounds())
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})