import http, { IncomingMessage, ServerResponse } from 'http'
import { Bridge as BridgeType } from '@vercel/node-bridge/bridge'

const startTime = process.hrtime()

const FastBootAppServer = require('fastboot-app-server');
const ExpressHTTPServer = require('fastboot-app-server/src/express-http-server');

const httpServer = new ExpressHTTPServer(/* {options} */);
// const app = httpServer.app;
const fastBootServer = new FastBootAppServer({
  httpServer: httpServer
});

// Start nuxt initialization process
let isReady = false
const readyPromise = fastBootServer.start().then(() => {
  isReady = true
  const hrTime = process.hrtime(startTime)
  const hrTimeMs = ((hrTime[0] * 1e9) + hrTime[1]) / 1e6
  // eslint-disable-next-line no-console
  console.log(`λ Cold start took: ${hrTimeMs}ms`)
}).catch((error: string | Error) => {
  // eslint-disable-next-line no-console
  console.error('λ Error while initializing fastboot app server:', error)
  process.exit(1)
})

// Create bridge and start listening
const { Server } = require('http') // eslint-disable-line import/order
const { Bridge } = require('./now__bridge.js')

const server = new (Server as typeof http.Server)(
  async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    if (!isReady) {
      await readyPromise
    }
    fastBootServer.app(req, res)
  }
)
const bridge = new (Bridge as typeof BridgeType)(server)

bridge.listen()

export const launcher: typeof bridge.launcher = bridge.launcher
