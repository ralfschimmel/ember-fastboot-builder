"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.build = void 0;
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const consola_1 = __importDefault(require("consola"));
const execa_1 = __importDefault(require("execa"));
const build_utils_1 = require("@vercel/build-utils");
const utils_1 = require("./utils");
async function build({ files, entrypoint, workPath, repoRootPath, config = {}, meta = {}, }) {
    // ----------------- Prepare build -----------------
    utils_1.startStep("Prepare build");
    // Validate entrypoint
    utils_1.validateEntrypoint(entrypoint);
    // Get Nuxt directory
    const entrypointDirname = path_1.default.dirname(entrypoint);
    consola_1.default.log('entrypointDirname:', entrypointDirname);
    // Get Nuxt path
    const entrypointPath = path_1.default.join(workPath, entrypointDirname);
    consola_1.default.log('entrypointPath:', entrypointPath);
    // Get folder where we'll store node_modules
    const modulesPath = path_1.default.join(repoRootPath || entrypointPath, 'node_modules');
    consola_1.default.log('modulesPath:', modulesPath);
    // Create a real filesystem
    consola_1.default.log("Downloading files...");
    await build_utils_1.download(files, workPath, meta);
    // Change cwd to rootDir
    process.chdir(entrypointPath);
    consola_1.default.log("Working directory:", process.cwd());
    // Read package.json
    let pkg;
    try {
        pkg = await utils_1.readJSON("package.json");
    }
    catch (e) {
        throw new Error(`Can not read package.json from ${entrypointPath}`);
    }
    // Node version
    const nodeVersion = await build_utils_1.getNodeVersion(entrypointPath, undefined, config, meta);
    consola_1.default.log("nodeVersion: ", nodeVersion);
    consola_1.default.log("meta: ", meta);
    const spawnOpts = build_utils_1.getSpawnOptions(meta, nodeVersion);
    // consola.log("spawnOpts.env: ",spawnOpts.env);
    consola_1.default.log(await execa_1.default("node", ["-v"]));
    // Detect npm (prefer yarn)
    const isYarn = !fs_extra_1.default.existsSync("package-lock.json");
    consola_1.default.log("Using", isYarn ? "yarn" : "npm");
    // Write .npmrc
    if (process.env.NPM_AUTH_TOKEN) {
        consola_1.default.log("Found NPM_AUTH_TOKEN in environment, creating .npmrc");
        await fs_extra_1.default.writeFile(".npmrc", `//registry.npmjs.org/:_authToken=${process.env.NPM_AUTH_TOKEN}`);
    }
    // Write .yarnclean
    if (isYarn && !fs_extra_1.default.existsSync(".yarnclean")) {
        await fs_extra_1.default.copyFile(path_1.default.join(__dirname, ".yarnclean"), ".yarnclean");
    }
    // Cache dir
    const cacheDir = path_1.default.resolve(entrypointPath, ".now_cache");
    await fs_extra_1.default.mkdirp(cacheDir);
    const yarnCacheDir = path_1.default.join(cacheDir, "yarn");
    await fs_extra_1.default.mkdirp(yarnCacheDir);
    // ----------------- Install devDependencies -----------------
    utils_1.startStep("Install devDependencies");
    // Install all dependencies
    await utils_1.exec("yarn", [
        "install",
        "--prefer-offline",
        "--pure-lockfile",
        "--frozen-lockfile",
        "--non-interactive",
        "--production=false",
        `--modules-folder=${modulesPath}`,
        `--cache-folder=${yarnCacheDir}`,
    ], { ...spawnOpts, env: { ...spawnOpts.env, NODE_ENV: "development" } });
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
    // const buildDir = nuxtConfigFile.buildDir ? path.relative(rootDir, nuxtConfigFile.buildDir) : '.nuxt'
    const lambdaName = "index";
    await utils_1.exec("yarn", ["build"]);
    // ----------------- Install dependencies -----------------
    utils_1.startStep("Install dependencies");
    // Only keep core dependency
    // preparePkgForProd(pkg);
    // await fs.writeJSON("package.json", pkg);
    await utils_1.exec("yarn", [
        "install",
        "--prefer-offline",
        "--pure-lockfile",
        "--non-interactive",
        "--production=true",
        `--modules-folder=${modulesPath}`,
        `--cache-folder=${yarnCacheDir}`,
    ], spawnOpts);
    // Cleanup .npmrc
    if (process.env.NPM_AUTH_TOKEN) {
        await fs_extra_1.default.unlink(".npmrc");
    }
    // ----------------- Collect artifacts -----------------
    utils_1.startStep("Collect artifacts");
    // Client dist files
    const clientDistDir = path_1.default.join(entrypointPath, "dist");
    const clientDistFiles = await utils_1.globAndPrefix("**", clientDistDir, publicPath);
    consola_1.default.log('clientDistDir', clientDistDir);
    consola_1.default.log('clientDistFiles', clientDistFiles);
    // node_modules_prod // todo prune node_modules for prod
    const nodeModulesDir = path_1.default.join(entrypointPath, "node_modules");
    const nodeModules = await utils_1.globAndPrefix("**", nodeModulesDir, "node_modules");
    // Lambdas
    const lambdas = {};
    const launcherPath = path_1.default.join(__dirname, "launcher.js");
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
        const files = await build_utils_1.glob(pattern, entrypointPath);
        Object.assign(launcherFiles, files);
    }
    consola_1.default.log('launcherFiles: ', launcherFiles);
    // lambdaName will be titled index, unless specified in nuxt.config.js
    lambdas[lambdaName] = await build_utils_1.createLambda({
        handler: "now__launcher.launcher",
        runtime: nodeVersion.runtime,
        files: launcherFiles,
        environment: {
            NODE_ENV: "production",
        },
    });
    // await download(launcherFiles, rootDir)
    utils_1.endStep();
    consola_1.default.log('lambdas: ', lambdas);
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
