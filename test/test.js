const assert = require('assert')
const electron = require('electron')
const Application = require('spectron').Application

const app = new Application({
    path: electron,
    args: ['app']
})

describe('App Testing:', function () {
    this.timeout(10000)

    beforeEach(() => {
        return app.start()
    })

    it('Window Tests', () => {
        app.start().then(() => {
            // Check if the window is visible
            return app.browserWindow.isVisible()
        }).then(isVisible => {
            // Verify the window is visible
            assert.equal(isVisible, true)
        }).then(() => {
            // Get the window's title
            return app.client.getTitle()
        }).then(title => {
            // Verify the window's title
            assert.equal(title, 'Playcode')
        }).then(() => {
            // Stop the application
            return app.stop()
        }).catch(err => {
            // Log any failures
            console.err('Test failed', err.message)
        })
    })

    afterEach(() => {
        if (app && app.isRunning()) {
            return app.stop()
        }
    })
})
