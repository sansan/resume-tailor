import { app, BrowserWindow, nativeImage } from 'electron'
import * as path from 'path'
import { registerIPCHandlers } from './ipc-handlers'
import { databaseService } from './services/database.service'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null

const isDev = !app.isPackaged

function createWindow(): void {
  // Get the icon path based on environment
  const iconPath = isDev
    ? path.join(__dirname, '../../../build/icons/256x256.png')
    : path.join(__dirname, '../../../build/icons/256x256.png')

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 1000,
    minWidth: 900,
    minHeight: 800,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  // Load the app
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    // Open DevTools in development
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built index.html
    // __dirname is dist-electron/src/main/, so we go up 3 levels to reach the root
    mainWindow.loadFile(path.join(__dirname, '../../../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  // Set dock icon on macOS
  if (process.platform === 'darwin' && app.dock) {
    const iconPath = isDev
      ? path.join(__dirname, '../../../build/icons/512x512.png')
      : path.join(__dirname, '../../../build/icons/512x512.png')
    const dockIcon = nativeImage.createFromPath(iconPath)
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }

  // Initialize the database
  databaseService.init()

  // Register IPC handlers before creating the window
  registerIPCHandlers()

  createWindow()

  app.on('activate', () => {
    // On macOS, re-create a window when the dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Close database connection on quit
app.on('quit', () => {
  databaseService.close()
})
