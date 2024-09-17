import { BrowserWindow } from 'electron'
import logger from 'electron-log'
import autoUpdaterPkg, { UpdateInfo } from 'electron-updater'

const { autoUpdater } = autoUpdaterPkg

class AppUpdater {
  constructor(private mainWindow: BrowserWindow | null = null) {
    // Configure logger
    logger.transports.file.level = 'info'
    logger.transports.console.level = 'info'
    autoUpdater.logger = logger
    autoUpdater.disableWebInstaller = true
    autoUpdater.autoInstallOnAppQuit = true

    // Listen for the 'update-downloaded' event
    autoUpdater.on('update-downloaded', this.onUpdateDownloaded.bind(this))

    // Check for updates upon initialization
    void this.checkForUpdates()
  }

  private async onUpdateDownloaded(info: UpdateInfo) {
    logger.info('Update downloaded:', info)

    if (this.mainWindow) {
      const isConfirmed = await this.mainWindow.webContents.executeJavaScript(`confirm('Update downloaded. Restart now?')`)

      if (isConfirmed) {
        autoUpdater.quitAndInstall()
      }
    }
  }

  public async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdatesAndNotify({
        title: 'Update Downloaded',
        body: 'A new update has been downloaded. Would you like to restart the application to apply the updates?',
      })
    } catch (error) {
      logger.error('Failed to check for updates:', error)
    }
  }
}

export { AppUpdater }
