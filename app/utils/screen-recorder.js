const {app, BrowserWindow, globalShortcut, screen, Notification} = require('electron')
const {exec} = require('child_process')
const path = require('path')
const os = require('os')

const WINDOW_WIDTH = 1000
const WINDOW_HEIGHT = 613

const RECORDING_PADDING_LEFT = 0 // Can be positive or negative
const RECORDING_PADDING_TOP = 0
const RECORDING_PADDING_RIGHT = 0
const RECORDING_PADDING_BOTTOM = 0

const RECORDING_FRAME_RATE = 60
const RECORDING_DIR = path.join(os.homedir(), 'Desktop')

let ffmpegProcess

// Function to get the active screen index for Electron
function getActiveScreenIndex() {
  const displays = screen.getAllDisplays()
  const cursorPoint = screen.getCursorScreenPoint()

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
function getFFmpegScreenIndices(callback) {
  const ffmpegCommand = 'ffmpeg -f avfoundation -list_devices true -i ""'

  exec(ffmpegCommand, (error, stdout, stderr) => {
    if (error) {
      if (stderr.includes('Input/output error')) {
        console.warn('Usually it is okay. Because show some input devices error.')
        stdout = stderr
      } else {
        console.error('Error listing FFmpeg devices:', error)
        return
      }
    }

    // Parse the output to find the indices of Capture screen 0 and Capture screen 1
    const captureScreen0 = stdout.match(/(\[\d+\]) Capture screen 0/)
    const captureScreen1 = stdout.match(/(\[\d+\]) Capture screen 1/)

    if (captureScreen0 && captureScreen1) {
      const screen0Index = captureScreen0[1].replace(/\[|\]/g, '')
      const screen1Index = captureScreen1[1].replace(/\[|\]/g, '')
      callback({screen0Index, screen1Index})
    } else if (captureScreen0) {
      const screen0Index = captureScreen0[1].replace(/\[|\]/g, '')
      callback({screen0Index})
    } else {
      console.error('Could not find Capture screen 0 or 1 in FFmpeg output.')
      callback(null)
    }
  })
}

// Function to get the window position and size
function getCenteredWindowPositionAndSize() {
  const activeScreenIndex = getActiveScreenIndex()
  if (activeScreenIndex === -1) {
    console.error('No active screen found.')
    return
  }

  const displays = screen.getAllDisplays()
  const display = displays[activeScreenIndex]

  let x = display.bounds.x
  let y = display.bounds.y
  let screenSizeWidth = display.bounds.width
  let screenSizeHeight = display.bounds.height

  console.log('Screen size:', screenSizeWidth, screenSizeHeight)
  console.log('Window size:', WINDOW_WIDTH, WINDOW_HEIGHT)
  console.log('Screen position:', x, y)

  // Calculate x/y to put the window in the center of the screen
  x += parseInt((screenSizeWidth - WINDOW_WIDTH) / 2)
  y += parseInt((screenSizeHeight - WINDOW_HEIGHT) / 2)

  console.log('Center window position:', x, y)

  return {x, y, width: WINDOW_WIDTH, height: WINDOW_HEIGHT}
}

// Function to get the window position and size, adjusted for FFmpeg's screen
function getWindowPositionAndSizeFFmpeg(mainWindow) {
  const activeScreenIndex = getActiveScreenIndex()

  if (activeScreenIndex === -1) {
    console.error('No active screen found.')
    return
  }

  const displays = screen.getAllDisplays()
  const display = displays[activeScreenIndex]

  // Get the scale factor (devicePixelRatio) for the screen
  const scaleFactor = display.scaleFactor || 1

  const screenSizeWidth = display.bounds.width
  const screenSizeHeight = display.bounds.height
  console.log('Display bounds:', display.bounds)

  const mainWindowBounds = mainWindow.getBounds()
  console.log('mainWindowBounds', mainWindowBounds)

  const width = mainWindowBounds.width + RECORDING_PADDING_LEFT + RECORDING_PADDING_RIGHT
  const height = mainWindowBounds.height + RECORDING_PADDING_TOP + RECORDING_PADDING_BOTTOM
  const x = mainWindowBounds.x - RECORDING_PADDING_LEFT
  const y = mainWindowBounds.y - RECORDING_PADDING_TOP

  console.log('Screen size (logical):', screenSizeWidth, screenSizeHeight)
  console.log('Window size (logical):', width, height)

  // Adjust the window size and position for the screen's density (scale factor)
  const adjustedWindowWidth = width * scaleFactor
  const adjustedWindowHeight = height * scaleFactor
  const adjustedX = (x - display.bounds.x) * scaleFactor
  const adjustedY = (y - display.bounds.y) * scaleFactor

  console.log('Adjusted window size (physical):', adjustedWindowWidth, adjustedWindowHeight)
  console.log('Adjusted window position (physical):', adjustedX, adjustedY)

  return { x: adjustedX, y: adjustedY, width: adjustedWindowWidth, height: adjustedWindowHeight }
}

// Function to set the window position and size
function setWindowPositionAndSize(mainWindow) {
  const {x, y, width, height} = getCenteredWindowPositionAndSize()
  mainWindow.setPosition(x, y)
  mainWindow.setSize(width, height)
}

// Function to start screen recording with ffmpeg
function startScreenRecording(mainWindow) {
  const activeScreenIndex = getActiveScreenIndex()
  if (activeScreenIndex === -1) {
    console.error('No active screen found.')
    return
  }

  // Get the correct FFmpeg screen indices and map the active screen to it
  getFFmpegScreenIndices((screenIndices) => {
    if (!screenIndices) {
      console.error('Could not find FFmpeg screen indices.')
      return
    }

    console.log('Screen recording started')
    const {x, y, width, height} = getWindowPositionAndSizeFFmpeg(mainWindow)

    // Map Electron's active screen to FFmpeg's screen indices
    const ffmpegScreenIndex = activeScreenIndex === 0 ? screenIndices.screen0Index : screenIndices.screen1Index
    console.log('ffmpeg active screen index:', ffmpegScreenIndex)

    // Path to save the video in Downloads folder
    const outputFilePath = path.join(RECORDING_DIR, `recording_${Date.now()}.mov`)
    
    // Command to record the specific region (window) using ffmpeg
    const ffmpegCommand = `
      ffmpeg -y -f avfoundation -r "${RECORDING_FRAME_RATE}" -i "${ffmpegScreenIndex}" -vf "crop=${width}:${height}:${x}:${y}" -pix_fmt yuv420p "${outputFilePath}"
    `

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

function stopScreenRecording() {
  if (ffmpegProcess) {
    // Send SIGINT (Ctrl+C) to stop ffmpeg gracefully
    ffmpegProcess.stdin.write('q') // Tells ffmpeg to stop recording
    console.log('Recording stopped gracefully')

    new Notification({title: 'Stopped recording', body: '...'}).show()
  }
}

// Function to stop screen recording
function killScreenRecording() {
  if (ffmpegProcess) {
    ffmpegProcess.kill()
    console.log('Recording killed')
  }
}

// Function to register global shortcut
function registerGlobalShortcut(getMainWindow) {
  // start recording shortcut with window positioning
  globalShortcut.register('CmdOrCtrl+Shift+7', () => {
    new Notification({title: 'Started recording', body: 'With centered positioning'}).show()

    setWindowPositionAndSize(getMainWindow())
    startScreenRecording(getMainWindow())
  })

  // start recording shortcut
  globalShortcut.register('CmdOrCtrl+Shift+Alt+7', () => {
    new Notification({title: 'Started recording', body: '...'}).show()

    startScreenRecording(getMainWindow())
  })

  // stop recording shortcut
  globalShortcut.register('CmdOrCtrl+Shift+8', () => {
    stopScreenRecording()
  })

  // Electron app events
  app.on('will-quit', () => {
    killScreenRecording()
  })

  // Stop the recording when the window is closed
  getMainWindow().on('closed', killScreenRecording)
}

module.exports = {
  registerGlobalShortcut,
}