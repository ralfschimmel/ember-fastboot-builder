"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileTypescriptBuildFiles = exports.prepareTypescriptEnvironment = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const replace_in_file_1 = __importDefault(require("replace-in-file"));
const build_utils_1 = require("@vercel/build-utils");
const utils_1 = require("./utils");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function prepareTypescriptEnvironment({ pkg, spawnOpts, rootDir }) {
    spawnOpts = { ...spawnOpts, env: { ...spawnOpts.env, NODE_PRESERVE_SYMLINKS: '1' } };
    if ((fs_extra_1.default.existsSync('tsconfig.json'))) {
        let tsConfig;
        try {
            tsConfig = await utils_1.readJSON('tsconfig.json');
        }
        catch (e) {
            throw new Error(`Can not read tsconfig.json from ${rootDir}`);
        }
        tsConfig.exclude = [...(tsConfig.exclude || []), 'node_modules_dev', 'node_modules_prod'];
        await fs_extra_1.default.writeJSON('tsconfig.json', tsConfig);
    }
    //   Edit dependencies
    if (pkg.dependencies && Object.keys(pkg.dependencies).includes('@nuxt/typescript-runtime')) {
        delete pkg.dependencies['@nuxt/typescript-runtime'];
    }
}
exports.prepareTypescriptEnvironment = prepareTypescriptEnvironment;
async function readAndMergeOptions(filename, rootDir, options) {
    let newOptions = options;
    if (fs_extra_1.default.existsSync(filename)) {
        let tsConfig;
        try {
            tsConfig = await utils_1.readJSON(filename);
        }
        catch (e) {
            throw new Error(`Can not read ${filename} from ${rootDir}`);
        }
        newOptions = { ...tsConfig.compilerOptions, ...options };
    }
    return newOptions;
}
async function getTypescriptCompilerOptions(rootDir, options = {}) {
    let compilerOptions = [];
    options = await readAndMergeOptions('tsconfig.json', rootDir, options);
    options = await readAndMergeOptions('tsconfig.now.json', rootDir, options);
    compilerOptions = Object.keys(options).reduce((compilerOptions, option) => {
        if (compilerOptions && !['rootDirs', 'paths', 'outDir', 'rootDir', 'noEmit'].includes(option)) {
            compilerOptions.push(`--${option}`, String(options[option]));
        }
        return compilerOptions;
    }, []);
    return [...compilerOptions, '--noEmit', 'false', '--rootDir', rootDir, '--outDir', 'now_compiled'];
}
async function compileTypescriptBuildFiles({ rootDir, spawnOpts, tscOptions }) {
    const nuxtConfigName = utils_1.getNuxtConfigName(rootDir);
    const compilerOptions = await getTypescriptCompilerOptions(rootDir, tscOptions);
    await fs_extra_1.default.mkdirp('now_compiled');
    await utils_1.exec('tsc', [...compilerOptions, nuxtConfigName], spawnOpts);
    const nuxtConfigFile = utils_1.getNuxtConfig(rootDir, 'now_compiled/nuxt.config.js');
    const { serverMiddleware, modules } = nuxtConfigFile;
    const filesToCompile = [
        ...(serverMiddleware || []),
        ...(modules || [])
    ].reduce((filesToCompile, item) => {
        let itemPath = '';
        if (typeof item === 'string') {
            itemPath = item;
        }
        else if (typeof item === 'object' && Array.isArray(item)) {
            if (typeof item[0] === 'string') {
                itemPath = item[0];
            }
            // We do not need to handle inline modules
        }
        else if (typeof item === 'object' && typeof item.handler === 'string') {
            itemPath = item.handler;
        }
        if (itemPath) {
            const srcDir = nuxtConfigFile.srcDir ? (path_1.default.relative(rootDir, nuxtConfigFile.srcDir)).replace('now_compiled', '.') : '.';
            const resolvedPath = path_1.default.resolve(rootDir, itemPath.replace(/^[@~]\//, `${srcDir}/`).replace(/\.ts$/, ''));
            if (fs_extra_1.default.existsSync(`${resolvedPath}.ts`)) {
                filesToCompile.push(resolvedPath);
                replace_in_file_1.default.sync({
                    files: path_1.default.resolve(rootDir, 'now_compiled/nuxt.config.js'),
                    from: new RegExp(`(?<=['"\`])${itemPath}(?=['"\`])`, 'g'),
                    to: itemPath.replace(/\.ts$/, '')
                });
            }
        }
        return filesToCompile;
    }, []);
    await Promise.all(filesToCompile.map(file => utils_1.exec('tsc', [...compilerOptions, file])));
    const files = await build_utils_1.glob('**', path_1.default.join(rootDir, 'now_compiled'));
    Object.keys(files).forEach((filename) => {
        const compiledPath = files[filename].fsPath;
        const newPath = compiledPath.replace('/now_compiled/', '/');
        fs_extra_1.default.moveSync(compiledPath, newPath, { overwrite: true });
        files[filename].fsPath = newPath;
    });
    return files;
}
exports.compileTypescriptBuildFiles = compileTypescriptBuildFiles;
