"use strict";
// import { fork, spawn } from 'child_process';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
// import {
//   readFileSync,
//   lstatSync,
//   readlinkSync,
//   statSync,
//   promises as fsp,
// } from 'fs';
const path_1 = require("path");
const fs_extra_1 = __importDefault(require("fs-extra"));
const consola_1 = __importDefault(require("consola"));
// import execa from 'execa'
const build_utils_1 = require("@vercel/build-utils");
const utils_1 = require("./utils");
async function downloadInstallAndBundle({ files, entrypoint, workPath, config, meta, }, isProduction = false) {
    const downloadedFiles = await build_utils_1.download(files, workPath, meta);
    const entrypointFsDirname = path_1.join(workPath, path_1.dirname(entrypoint));
    const nodeVersion = await build_utils_1.getNodeVersion(entrypointFsDirname, undefined, config, meta);
    const spawnOpts = build_utils_1.getSpawnOptions(meta, nodeVersion);
    if (meta.isDev) {
        build_utils_1.debug("Skipping dependency installation because dev mode is enabled");
    }
    else {
        const installTime = Date.now();
        console.log("Installing dependencies...");
        const args = ["--prefer-offline"];
        if (isProduction) {
            args.push('--production');
            args.push('--force');
        }
        await build_utils_1.runNpmInstall(entrypointFsDirname, args, spawnOpts, meta);
        build_utils_1.debug(`Install complete [${Date.now() - installTime}ms]`);
    }
    const entrypointPath = downloadedFiles[entrypoint].fsPath;
    return { entrypointPath, entrypointFsDirname, nodeVersion, spawnOpts };
}
function getAWSLambdaHandler(entrypoint, config) {
    if (config.awsLambdaHandler) {
        return config.awsLambdaHandler;
    }
    if (process.env.NODEJS_AWS_HANDLER_NAME) {
        const { dir, name } = path_1.parse(entrypoint);
        return `${dir}${dir ? path_1.sep : ""}${name}.${process.env.NODEJS_AWS_HANDLER_NAME}`;
    }
    return "index";
}
async function build({ files, entrypoint, workPath, repoRootPath, config = {}, meta = {}, }) {
    const shouldAddHelpers = !(config.helpers === false || process.env.NODEJS_HELPERS === "0");
    const baseDir = repoRootPath || workPath;
    const awsLambdaHandler = getAWSLambdaHandler(entrypoint, config);
    // ----------------- Prepare build -----------------
    utils_1.startStep("Prepare build");
    // Validate entrypoint
    // validateEntrypoint(entrypoint);
    utils_1.startStep("Install devDependencies");
    const { entrypointPath, entrypointFsDirname, nodeVersion, spawnOpts, } = await downloadInstallAndBundle({
        files,
        entrypoint,
        workPath,
        config,
        meta,
    }, false);
    // Create a real filesystem
    // consola.log("Downloading files...");
    // await download(files, workPath, meta);
    // Change cwd to package rootDir
    // process.chdir(entrypointPath);
    // consola.log("Working directory:", process.cwd());
    // Read package.json
    // let pkg: MutablePackageJson;
    // try {
    //   pkg = await readJSON("package.json");
    // } catch (e) {
    //   throw new Error(`Can not read package.json from ${entrypointPath}`);
    // }
    // consola.log("spawnOpts.env: ",spawnOpts.env);
    // consola.log(await execa("node", ["-v"]));
    // Detect npm (prefer yarn)
    // const isYarn = !fs.existsSync("package-lock.json");
    // consola.log("Using", isYarn ? "yarn" : "npm");
    // Write .yarnclean
    // if (isYarn && !fs.existsSync(".yarnclean")) {
    //   await fs.copyFile(join(__dirname, ".yarnclean"), ".yarnclean");
    // }
    // Cache dir
    // const cacheDir = resolve(entrypointPath, ".now_cache");
    // await fs.mkdirp(cacheDir);
    // const yarnCacheDir = join(cacheDir, "yarn");
    // await fs.mkdirp(yarnCacheDir);
    // ----------------- Install devDependencies -----------------
    // assert(isAbsolute(entrypointPath));
    // consola.log(`Installing to ${repoRootPath}`);
    // Change cwd to package rootDir
    // process.chdir(entrypointPath);
    // consola.log("Working directory:", process.cwd());
    // Install all dependencies
    // await exec(
    //   "yarn",
    //   [
    //     "install",
    //     "--prefer-offline",
    //     "--non-interactive",
    //     "--production=false",
    //     `--cache-folder=${yarnCacheDir}`,
    //   ],
    //   { ...spawnOpts, env: { ...spawnOpts.env, NODE_ENV: "development" }, cwd: repoRootPath }
    // );
    // ----------------- Pre build -----------------
    // if (pkg.scripts && Object.keys(pkg.scripts).includes('now-build')) {
    //   startStep('Pre build')
    //   if (isYarn) {
    //     await exec('yarn', [
    //       'now-build'
    //     ], spawnOpts)
    //   } else {
    //     await exec('npm', [
    //       'run',
    //       'now-build'
    //     ], spawnOpts)
    //   }
    // }
    // ----------------- Nuxt build -----------------
    utils_1.startStep("Ember build");
    const publicPath = "dist";
    // const buildDir = nuxtConfigFile.buildDir ? relative(rootDir, nuxtConfigFile.buildDir) : '.nuxt'
    await utils_1.exec("yarn", ["build"]);
    // ----------------- Prune dependencies -----------------
    utils_1.startStep("Prune dependencies");
    await downloadInstallAndBundle({
        files,
        entrypoint,
        workPath,
        config,
        meta,
    }, true);
    // Only keep core dependency
    // preparePkgForProd(pkg);
    // await fs.writeJSON("package.json", pkg);
    // await exec(
    //   "yarn",
    //   [
    //     "install",
    //     "--prefer-offline",
    //     "--non-interactive",
    //     "--production=true",
    //     `--cache-folder=${yarnCacheDir}`,
    //   ],
    //   spawnOpts
    // );
    // Cleanup .npmrc
    // if (process.env.NPM_AUTH_TOKEN) {
    //   await fs.unlink(".npmrc");
    // }
    // ----------------- Collect artifacts -----------------
    utils_1.startStep("Collect artifacts");
    // Client dist files
    const clientDistDir = path_1.join(entrypointFsDirname, "dist");
    const clientDistFiles = await utils_1.globAndPrefix("**", clientDistDir, publicPath);
    consola_1.default.log("clientDistDir", clientDistDir);
    consola_1.default.log("clientDistFiles", clientDistFiles);
    // node_modules_prod // todo prune node_modules for prod
    const nodeModulesDir = path_1.join(entrypointFsDirname, "node_modules");
    const nodeModules = await utils_1.globAndPrefix("**", nodeModulesDir, "node_modules");
    // Lambdas
    const lambdas = {};
    const launcherPath = path_1.join(__dirname, "launcher.js");
    const launcherSrc = await fs_extra_1.default.readFile(launcherPath, "utf8");
    const launcherFiles = {
        "now__launcher.js": new build_utils_1.FileBlob({ data: launcherSrc }),
        "now__bridge.js": new build_utils_1.FileFsRef({ fsPath: require("@vercel/node-bridge") }),
        ...nodeModules,
    };
    // Extra files to be included in lambda
    const serverFiles = [
        ...(Array.isArray(config.includeFiles)
            ? config.includeFiles
            : config.includeFiles
                ? [config.includeFiles]
                : []),
        ...(Array.isArray(config.serverFiles) ? config.serverFiles : []),
        "package.json",
    ];
    for (const pattern of serverFiles) {
        const files = await build_utils_1.glob(pattern, entrypointFsDirname);
        Object.assign(launcherFiles, files);
    }
    consola_1.default.log("launcherFiles: ", launcherFiles);
    // lambdaName will be titled index, unless specified in nuxt.config.js
    lambdas[awsLambdaHandler] = await build_utils_1.createLambda({
        handler: "now__launcher.launcher",
        runtime: nodeVersion.runtime,
        files: launcherFiles,
        environment: {
            NODE_ENV: "production",
        },
    });
    // await download(launcherFiles, rootDir)
    utils_1.endStep();
    consola_1.default.log("lambdas: ", lambdas);
    // consola.log(clientDistFiles);
    // consola.log(clientDistFiles);
    return {
        output: {
            ...lambdas,
            ...clientDistFiles,
        },
        routes: [
            {
                src: `/${publicPath}.+`,
                headers: { "Cache-Control": "max-age=31557600" },
            },
            { handle: "filesystem" },
            { src: "/(.*)", dest: "/index" },
        ],
    };
}
exports.build = build;
