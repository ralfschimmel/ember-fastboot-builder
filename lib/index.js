"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const build_1 = require("./build");
const config_1 = __importDefault(require("./config"));
const prepare_cache_1 = __importDefault(require("./prepare-cache"));
// Docs: https://github.com/zeit/now/blob/master/DEVELOPING_A_RUNTIME.md
module.exports = {
    version: 3,
    build: build_1.build,
    config: config_1.default,
    prepareCache: prepare_cache_1.default
};
