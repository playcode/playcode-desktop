const Config = require('electron-config')

const config = new Config({
    defaults: {
        lastWindowState: {
            width: 1024,
            height: 800
        }
    }
})

module.exports = config