import { Rectangle } from 'electron'
import Store from 'electron-store'

interface ConfigSchema {
  lastWindowState?: Rectangle
}

const store = new Store<ConfigSchema>()

export default store
