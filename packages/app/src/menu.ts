// Import necessary Electron modules and types
import { BrowserWindow, Menu, MenuItem, MenuItemConstructorOptions, app, shell } from 'electron'

// Retrieve application name and version
const appName: string = app.getName()
const appVersion: string = app.getVersion()

// Define the menu template for Windows and Linux
const templateWin: MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: `Hide ${appName}`,
        accelerator: 'Control+H',
        role: 'hide',
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Control+W',
        role: 'close',
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'Control+Z', role: 'undo' },
      { label: 'Redo', accelerator: 'Shift+Control+Z', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Control+X', role: 'cut' },
      { label: 'Copy', accelerator: 'Control+C', role: 'copy' },
      { label: 'Paste', accelerator: 'Control+V', role: 'paste' },
      { label: 'Select All', accelerator: 'Control+A', role: 'selectAll' },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Back',
        accelerator: 'Backspace',
        click: (menuItem: MenuItem, focusedWindow: BrowserWindow | undefined) => {
          if (focusedWindow && focusedWindow.webContents.canGoBack()) {
            focusedWindow.webContents.goBack()
            focusedWindow.webContents.reload()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'F5',
        click: (menuItem: MenuItem, focusedWindow: BrowserWindow | undefined) => {
          if (focusedWindow) {
            focusedWindow.webContents.reload()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Toggle Dev Tools',
        accelerator: 'F12',
        click: (menuItem: MenuItem, focusedWindow: BrowserWindow | undefined) => {
          if (focusedWindow) {
            focusedWindow.webContents.toggleDevTools()
          }
        },
      },
    ],
  },
  {
    label: 'Window',
    role: 'window',
    submenu: [
      { label: 'Minimize', accelerator: 'Control+M', role: 'minimize' },
      { label: 'Close', accelerator: 'Control+W', role: 'close' },
    ],
  },
  {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: `About ${appName}`,
        click: () => {
          void shell.openExternal(`https://github.com/playcode/playcode-desktop/releases/tag/${appVersion}`)
        },
      },
      {
        label: `Version ${appVersion}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: `View ${appName}`,
        click: () => {
          void shell.openExternal('https://playcode.io')
        },
      },
      { type: 'separator' },
      // Uncomment the following block if you want to include the Changelog in Windows/Linux
      /*
      {
        label: 'Changelog',
        click: () => {
          shell.openExternal(`https://github.com/Meadowcottage/Playcode/releases/tag/${appVersion}`)
        },
      },
      */
    ],
  },
]

// Define the menu template for macOS
const templateOSX: MenuItemConstructorOptions[] = [
  {
    label: 'Application',
    submenu: [
      {
        label: `Hide ${appName}`,
        accelerator: 'Command+H',
        role: 'hide',
      },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit()
        },
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'Command+Z', role: 'undo' },
      { label: 'Redo', accelerator: 'Shift+Command+Z', role: 'redo' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'Command+X', role: 'cut' },
      { label: 'Copy', accelerator: 'Command+C', role: 'copy' },
      { label: 'Paste', accelerator: 'Command+V', role: 'paste' },
      { label: 'Select All', accelerator: 'Command+A', role: 'selectAll' },
    ],
  },
  {
    label: 'View',
    submenu: [
      {
        label: 'Back',
        accelerator: 'Command+Left',
        click: (menuItem: MenuItem, focusedWindow: BrowserWindow | undefined) => {
          if (focusedWindow && focusedWindow.webContents.canGoBack()) {
            focusedWindow.webContents.goBack()
            focusedWindow.webContents.reload()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'Command+R',
        click: (menuItem: MenuItem, focusedWindow: BrowserWindow | undefined) => {
          if (focusedWindow) {
            focusedWindow.webContents.reload()
          }
        },
      },
      { type: 'separator' },
      {
        label: 'Toggle Dev Tools',
        accelerator: 'F12',
        click: (menuItem: MenuItem, focusedWindow: BrowserWindow | undefined) => {
          if (focusedWindow) {
            focusedWindow.webContents.toggleDevTools()
          }
        },
      },
    ],
  },
  {
    label: 'Window',
    role: 'window',
    submenu: [
      { label: 'Minimize', accelerator: 'Command+M', role: 'minimize' },
      { label: 'Close', accelerator: 'Command+W', role: 'close' },
    ],
  },
  {
    label: 'Help',
    role: 'help',
    submenu: [
      {
        label: `About ${appName}`,
        click: () => {
          void shell.openExternal(`https://github.com/playcode/playcode-desktop/releases/tag/${appVersion}`)
        },
      },
      {
        label: `Version ${appVersion}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: `View ${appName}`,
        click: () => {
          void shell.openExternal('https://playcode.io')
        },
      },
      { type: 'separator' },
      {
        label: 'Changelog',
        click: () => {
          void shell.openExternal(`https://github.com/playcode/playcode-desktop/releases/tag/${appVersion}`)
        },
      },
    ],
  },
]

// Build the menu from the appropriate template based on the platform
const menu = Menu.buildFromTemplate(process.platform === 'darwin' ? templateOSX : templateWin)

// Export the constructed menu as the default export
export default menu
