"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startStep = exports.endStep = exports.hrToMs = exports.preparePkgForProd = exports.findNuxtDep = exports.globAndPrefix = exports.globAndRename = exports.renameFiles = exports.validateEntrypoint = exports.readJSON = exports.exec = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const execa_1 = __importDefault(require("execa"));
const build_utils_1 = require("@vercel/build-utils");
const consola_1 = __importDefault(require("consola"));
function exec(cmd, args, { env, ...opts } = {}) {
    args = args.filter(Boolean);
    consola_1.default.log('Running', cmd, ...args);
    return execa_1.default('npx', [cmd, ...args], {
        stdout: process.stdout,
        stderr: process.stderr,
        preferLocal: false,
        env: {
            MINIMAL: '1',
            NODE_OPTIONS: '--max_old_space_size=3000',
            ...env
        },
        ...opts,
        stdio: Array.isArray(opts.stdio) ? opts.stdio.filter(Boolean) : opts.stdio
    });
}
exports.exec = exec;
/**
 * Read in a JSON file with support for UTF-16 fallback.
 */
async function readJSON(filename) {
    try {
        return await fs_extra_1.default.readJSON(filename);
    }
    catch {
        return await fs_extra_1.default.readJSON(filename, { encoding: 'utf16le' });
    }
}
exports.readJSON = readJSON;
/**
 * Validate if the entrypoint is allowed to be used
 */
function validateEntrypoint(entrypoint) {
    const filename = path_1.default.basename(entrypoint);
    if (['package.json'].includes(filename) === false) {
        throw new Error('Specified "src" for "ember-fastboot-builder" has to be "package.json"');
    }
}
exports.validateEntrypoint = validateEntrypoint;
// function filterFiles(files, filterFn) {
//   const newFiles = {}
//   for (const fileName in files) {
//     if (filterFn(files)) {
//       newFiles[fileName] = files[fileName]
//     }
//   }
//   return newFiles
// }
function renameFiles(files, renameFn) {
    const newFiles = {};
    for (const fileName in files) {
        newFiles[renameFn(fileName)] = files[fileName];
    }
    return newFiles;
}
exports.renameFiles = renameFiles;
async function globAndRename(pattern, opts, renameFn) {
    const files = await build_utils_1.glob(pattern, opts);
    return renameFiles(files, renameFn);
}
exports.globAndRename = globAndRename;
function globAndPrefix(pattern, opts, prefix) {
    return globAndRename(pattern, opts, name => path_1.default.join(prefix, name));
}
exports.globAndPrefix = globAndPrefix;
function findNuxtDep(pkg) {
    for (const section of ['dependencies', 'devDependencies']) {
        const deps = pkg[section];
        if (deps) {
            for (const suffix of ['-edge', '']) {
                const name = 'nuxt' + suffix;
                const version = deps[name];
                if (version) {
                    const semver = version.replace(/^[\^~><=]{1,2}/, '');
                    return {
                        name,
                        version,
                        semver,
                        suffix,
                        section
                    };
                }
            }
        }
    }
}
exports.findNuxtDep = findNuxtDep;
function preparePkgForProd(pkg) {
    // Ensure fields exist
    if (!pkg.dependencies) {
        pkg.dependencies = {};
    }
    if (!pkg.devDependencies) {
        pkg.devDependencies = {};
    }
    // Find nuxt dependency
    // const nuxtDependency = findNuxtDep(pkg)
    // if (!nuxtDependency) {
    //   throw new Error('No nuxt dependency found in package.json')
    // }
    // Remove nuxt form dependencies
    // for (const distro of ['nuxt', 'nuxt-start']) {
    //   for (const suffix of ['-edge', '']) {
    //     delete pkg.dependencies[distro + suffix]
    //   }
    // }
    // Delete all devDependencies
    delete pkg.devDependencies;
    // Add @nuxt/core to dependencies
    // pkg.dependencies['@nuxt/core' + nuxtDependency.suffix] = nuxtDependency.version
    // Return nuxtDependency
    return;
}
exports.preparePkgForProd = preparePkgForProd;
let _step;
let _stepStartTime;
const dash = ' ----------------- ';
function hrToMs(hr) {
    const hrTime = process.hrtime(hr);
    return ((hrTime[0] * 1e9) + hrTime[1]) / 1e6;
}
exports.hrToMs = hrToMs;
function endStep() {
    if (!_step) {
        return;
    }
    if (_step && _stepStartTime) {
        consola_1.default.info(`${_step} took: ${hrToMs(_stepStartTime)} ms`);
    }
    _step = undefined;
    _stepStartTime = undefined;
}
exports.endStep = endStep;
function startStep(step) {
    endStep();
    consola_1.default.log(dash + step + dash);
    _step = step;
    _stepStartTime = process.hrtime();
}
exports.startStep = startStep;
