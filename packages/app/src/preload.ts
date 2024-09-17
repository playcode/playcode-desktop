import { contextBridge, ipcRenderer } from 'electron'


// Example: Expose a safe API to the renderer
// contextBridge.exposeInMainWorld('electronAPI', {
// Define APIs here
// Example:
// send: (channel: string, data: any) => ipcRenderer.send(channel, data),
// receive: (channel: string, func: (...args: any[]) => void) => ipcRenderer.on(channel, (event, ...args) => func(...args))),
// })
