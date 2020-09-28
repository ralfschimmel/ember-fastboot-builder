"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.launcher = void 0;
const startTime = process.hrtime();
const FastBootAppServer = require('fastboot-app-server');
const ExpressHTTPServer = require('fastboot-app-server/src/express-http-server');
const httpServer = new ExpressHTTPServer( /* {options} */);
// const app = httpServer.app;
const fastBootServer = new FastBootAppServer({
    httpServer: httpServer
});
// Start nuxt initialization process
let isReady = false;
const readyPromise = fastBootServer.start().then(() => {
    isReady = true;
    const hrTime = process.hrtime(startTime);
    const hrTimeMs = ((hrTime[0] * 1e9) + hrTime[1]) / 1e6;
    // eslint-disable-next-line no-console
    console.log(`λ Cold start took: ${hrTimeMs}ms`);
}).catch((error) => {
    // eslint-disable-next-line no-console
    console.error('λ Error while initializing fastboot app server:', error);
    process.exit(1);
});
// Create bridge and start listening
const { Server } = require('http');
const { Bridge } = require('./now__bridge.js');
const server = new Server(async (req, res) => {
    if (!isReady) {
        await readyPromise;
    }
    fastBootServer.app(req, res);
});
const bridge = new Bridge(server);
bridge.listen();
exports.launcher = bridge.launcher;
