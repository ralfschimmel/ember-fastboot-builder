"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const build_utils_1 = require("@vercel/build-utils");
const fs_extra_1 = __importDefault(require("fs-extra"));
const consola_1 = __importDefault(require("consola"));
const utils_1 = require("./utils");
async function prepareCache({ workPath, entrypoint }) {
    const entryDir = path_1.default.dirname(entrypoint);
    utils_1.startStep('Collect cache');
    const cache = {};
    for (const dir of ['.now_cache', 'node_modules_dev', 'node_modules_prod']) {
        const activeDirectory = path_1.default.join(workPath, entryDir, dir);
        if (!fs_extra_1.default.existsSync(activeDirectory)) {
            consola_1.default.warn(activeDirectory, 'not exists. skipping!');
            continue;
        }
        const files = await build_utils_1.glob(path_1.default.join(entryDir, dir, '**'), workPath);
        consola_1.default.info(`${Object.keys(files).length} files collected from ${dir}`);
        Object.assign(cache, files);
    }
    utils_1.endStep();
    return cache;
}
exports.default = prepareCache;
