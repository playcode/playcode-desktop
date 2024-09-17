import { BrowserWindow, Notification, app, globalShortcut, screen } from 'electron'

import { ChildProcess, exec } from 'child_process'
import os from 'os'
import path from 'path'

// Constants
const WINDOW_WIDTH: number = 1000
const WINDOW_HEIGHT: number = 613

const RECORDING_PADDING_LEFT: number = 0 // Can be positive or negative
const RECORDING_PADDING_TOP: number = 0
const RECORDING_PADDING_RIGHT: number = 0
const RECORDING_PADDING_BOTTOM: number = 0

const RECORDING_FRAME_RATE: number = 60
const RECORDING_DIR: string = path.join(os.homedir(), 'Desktop')

// Variables
let ffmpegProcess: ChildProcess | undefined

// Interfaces
interface FFmpegScreenIndices {
  screen0Index: string
  screen1Index?: string
}

// Function to get the active screen index for Electron
function getActiveScreenIndex(): number {
  const displays = screen.getAllDisplays()
  const cursorPoint = screen.getCursorScreenPoint()

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < displays.length; i++) {
    const display = displays[i]
    const bounds = display.bounds

    if (
      cursorPoint.x >= bounds.x &&
      cursorPoint.x <= bounds.x + bounds.width &&
      cursorPoint.y >= bounds.y &&
      cursorPoint.y <= bounds.y + bounds.height
    ) {
      return i // Return Electron screen index
    }
  }

  return -1
}

// Function to get the FFmpeg screen indices dynamically
function getFFmpegScreenIndices(callback: (indices: FFmpegScreenIndices | null) => void): void {
  const ffmpegCommand: string = 'ffmpeg -f avfoundation -list_devices true -i ""'

  exec(ffmpegCommand, (error, stdout, stderr) => {
    let output = stdout
    if (error) {
      if (stderr.includes('Input/output error')) {
        console.warn('Usually it is okay. Because some input devices error.')
        output = stderr
      } else {
        console.error('Error listing FFmpeg devices:', error)
        callback(null)
        return
      }
    }

    // Parse the output to find the indices of Capture screen 0 and Capture screen 1
    const captureScreen0Match = output.match(/\[(\d+)\] Capture screen 0/)
    const captureScreen1Match = output.match(/\[(\d+)\] Capture screen 1/)

    if (captureScreen0Match && captureScreen1Match) {
      const screen0Index: string = captureScreen0Match[1]
      const screen1Index: string = captureScreen1Match[1]
      callback({ screen0Index, screen1Index })
    } else if (captureScreen0Match) {
      const screen0Index: string = captureScreen0Match[1]
      callback({ screen0Index })
    } else {
      console.error('Could not find Capture screen 0 or 1 in FFmpeg output.')
      callback(null)
    }
  })
}

// Function to get the window position and size centered on the active screen
function getCenteredWindowPositionAndSize(): { x: number; y: number; width: number; height: number } | undefined {
  const activeScreenIndex: number = getActiveScreenIndex()
  if (activeScreenIndex === -1) {
    console.error('No active screen found.')
    return
  }

  const displays = screen.getAllDisplays()
  const display = displays[activeScreenIndex]

  let x: number = display.bounds.x
  let y: number = display.bounds.y
  const screenSizeWidth: number = display.bounds.width
  const screenSizeHeight: number = display.bounds.height

  console.log('Screen size:', screenSizeWidth, screenSizeHeight)
  console.log('Window size:', WINDOW_WIDTH, WINDOW_HEIGHT)
  console.log('Screen position:', x, y)

  // Calculate x/y to center the window on the screen
  x += Math.floor((screenSizeWidth - WINDOW_WIDTH) / 2)
  y += Math.floor((screenSizeHeight - WINDOW_HEIGHT) / 2)

  console.log('Center window position:', x, y)

  return { x, y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT }
}

// Function to get the window position and size adjusted for FFmpeg's screen
function getWindowPositionAndSizeFFmpeg(mainWindow: BrowserWindow):
  | {
      x: number
      y: number
      width: number
      height: number
    }
  | undefined {
  const activeScreenIndex: number = getActiveScreenIndex()

  if (activeScreenIndex === -1) {
    console.error('No active screen found.')
    return
  }

  const displays = screen.getAllDisplays()
  const display = displays[activeScreenIndex]

  // Get the scale factor (devicePixelRatio) for the screen
  const scaleFactor: number = display.scaleFactor || 1

  const screenSizeWidth: number = display.bounds.width
  const screenSizeHeight: number = display.bounds.height
  console.log('Display bounds:', display.bounds)

  const mainWindowBounds = mainWindow.getBounds()
  console.log('mainWindowBounds', mainWindowBounds)

  const width: number = mainWindowBounds.width + RECORDING_PADDING_LEFT + RECORDING_PADDING_RIGHT
  const height: number = mainWindowBounds.height + RECORDING_PADDING_TOP + RECORDING_PADDING_BOTTOM
  const x: number = mainWindowBounds.x - RECORDING_PADDING_LEFT
  const y: number = mainWindowBounds.y - RECORDING_PADDING_TOP

  console.log('Screen size (logical):', screenSizeWidth, screenSizeHeight)
  console.log('Window size (logical):', width, height)

  // Adjust the window size and position for the screen's density (scale factor)
  const adjustedWindowWidth: number = width * scaleFactor
  const adjustedWindowHeight: number = height * scaleFactor
  const adjustedX: number = (x - display.bounds.x) * scaleFactor
  const adjustedY: number = (y - display.bounds.y) * scaleFactor

  console.log('Adjusted window size (physical):', adjustedWindowWidth, adjustedWindowHeight)
  console.log('Adjusted window position (physical):', adjustedX, adjustedY)

  return { x: adjustedX, y: adjustedY, width: adjustedWindowWidth, height: adjustedWindowHeight }
}

// Function to set the window position and size
function setWindowPositionAndSize(mainWindow: BrowserWindow): void {
  const positionSize = getCenteredWindowPositionAndSize()
  if (positionSize) {
    const { x, y, width, height } = positionSize
    mainWindow.setPosition(x, y)
    mainWindow.setSize(width, height)
  }
}

// Function to start screen recording with ffmpeg
function startScreenRecording(mainWindow: BrowserWindow): void {
  const activeScreenIndex: number = getActiveScreenIndex()
  if (activeScreenIndex === -1) {
    console.error('No active screen found.')
    return
  }

  // Get the correct FFmpeg screen indices and map the active screen to it
  getFFmpegScreenIndices((screenIndices: FFmpegScreenIndices | null) => {
    if (!screenIndices) {
      console.error('Could not find FFmpeg screen indices.')
      return
    }

    console.log('Screen recording started')
    const windowPositionSize = getWindowPositionAndSizeFFmpeg(mainWindow)
    if (!windowPositionSize) {
      console.error('Failed to get window position and size for FFmpeg.')
      return
    }

    const { x, y, width, height } = windowPositionSize

    // Map Electron's active screen to FFmpeg's screen indices
    const ffmpegScreenIndex: string | undefined =
      activeScreenIndex === 0 ? screenIndices.screen0Index : screenIndices.screen1Index

    if (!ffmpegScreenIndex) {
      console.error('FFmpeg screen index not found for the active screen.')
      return
    }

    console.log('ffmpeg active screen index:', ffmpegScreenIndex)

    // Path to save the video in the Desktop folder
    const outputFilePath: string = path.join(RECORDING_DIR, `recording_${Date.now()}.mov`)

    // Command to record the specific region (window) using ffmpeg
    const ffmpegCommand: string = `ffmpeg -y -f avfoundation -framerate ${RECORDING_FRAME_RATE} -i "${ffmpegScreenIndex}" -vf "crop=${width}:${height}:${x}:${y}" -pix_fmt yuv420p "${outputFilePath}"`

    // Start ffmpeg process
    ffmpegProcess = exec(ffmpegCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error during screen recording: ${error.message}`)
        return
      }
      console.log('Recording finished:', outputFilePath)
    })
  })
}

// Function to stop screen recording gracefully
function stopScreenRecording(): void {
  if (ffmpegProcess && ffmpegProcess.stdin) {
    // Send 'q' to ffmpeg's stdin to stop recording gracefully
    ffmpegProcess.stdin.write('q')
    console.log('Recording stopped gracefully')

    new Notification({ title: 'Stopped recording', body: 'Your screen recording has been stopped.' }).show()
  }
}

// Function to kill screen recording forcefully
function killScreenRecording(): void {
  if (ffmpegProcess) {
    ffmpegProcess.kill('SIGTERM')
    console.log('Recording killed')
  }
}

// Function to register global shortcuts
function registerGlobalShortcut(getMainWindow: () => BrowserWindow): void {
  // Start recording shortcut with window positioning
  const shortcut1 = 'CmdOrCtrl+Shift+7'
  const shortcut2 = 'CmdOrCtrl+Shift+Alt+7'
  const shortcut3 = 'CmdOrCtrl+Shift+8'

  const success1 = globalShortcut.register(shortcut1, () => {
    new Notification({ title: 'Started recording', body: 'With centered positioning' }).show()

    const mainWindow = getMainWindow()
    setWindowPositionAndSize(mainWindow)
    startScreenRecording(mainWindow)
  })

  if (!success1) {
    console.error(`Failed to register global shortcut: ${shortcut1}`)
  }

  // Start recording shortcut without window positioning
  const success2 = globalShortcut.register(shortcut2, () => {
    new Notification({ title: 'Started recording', body: '...' }).show()

    const mainWindow = getMainWindow()
    startScreenRecording(mainWindow)
  })

  if (!success2) {
    console.error(`Failed to register global shortcut: ${shortcut2}`)
  }

  // Stop recording shortcut
  const success3 = globalShortcut.register(shortcut3, () => {
    stopScreenRecording()
  })

  if (!success3) {
    console.error(`Failed to register global shortcut: ${shortcut3}`)
  }

  // Electron app events
  app.on('will-quit', () => {
    killScreenRecording()
    globalShortcut.unregisterAll()
  })

  // Stop the recording when the window is closed
  const mainWindow = getMainWindow()
  mainWindow.on('closed', () => {
    killScreenRecording()
  })
}

// Export the registerGlobalShortcut function
export default { registerGlobalShortcut }
