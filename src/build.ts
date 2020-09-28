// import { fork, spawn } from 'child_process';

// import {
//   readFileSync,
//   lstatSync,
//   readlinkSync,
//   statSync,
//   promises as fsp,
// } from 'fs';

import {
  // basename,
  dirname,
  // extname,
  join,
  // relative,
  // resolve,
  sep,
  parse as parsePath,
} from "path";

import fs from "fs-extra";
import consola from "consola";
// import execa from 'execa'

import {
  createLambda,
  debug,
  download,
  FileFsRef,
  FileBlob,
  glob,
  getNodeVersion,
  getSpawnOptions,
  runNpmInstall,
  BuildOptions,
  Lambda,
  File,
  Files,
  Config,
  Meta,
} from "@vercel/build-utils";
import { Route } from "@vercel/routing-utils";

import {
  exec,
  // validateEntrypoint,
  globAndPrefix,
  // preparePkgForProd,
  startStep,
  endStep,
  // MutablePackageJson,
  // readJSON,
} from "./utils";
// import { report } from "process";

interface BuilderOutput {
  watch?: string[];
  output: Record<string, Lambda | File | FileFsRef>;
  routes: Route[];
}

interface DownloadOptions {
  files: Files;
  entrypoint: string;
  workPath: string;
  config: Config;
  meta: Meta;
}

async function downloadInstallAndBundle({
  files,
  entrypoint,
  workPath,
  config,
  meta,
}: DownloadOptions, isProduction=false) {
  const downloadedFiles = await download(files, workPath, meta);

  const entrypointFsDirname = join(workPath, dirname(entrypoint));
  const nodeVersion = await getNodeVersion(
    entrypointFsDirname,
    undefined,
    config,
    meta
  );
  const spawnOpts = getSpawnOptions(meta, nodeVersion);

  if (meta.isDev) {
    debug("Skipping dependency installation because dev mode is enabled");
  } else {
    const installTime = Date.now();
    console.log("Installing dependencies...");
    const args = ["--prefer-offline"];
    if (isProduction) {
      args.push('--production');
      args.push('--force');
    }
    await runNpmInstall(
      entrypointFsDirname,
      args,
      spawnOpts,
      meta
    );
    debug(`Install complete [${Date.now() - installTime}ms]`);
  }

  const entrypointPath = downloadedFiles[entrypoint].fsPath;
  return { entrypointPath, entrypointFsDirname, nodeVersion, spawnOpts };
}

function getAWSLambdaHandler(entrypoint: string, config: Config) {
  if (config.awsLambdaHandler) {
    return config.awsLambdaHandler as string;
  }

  if (process.env.NODEJS_AWS_HANDLER_NAME) {
    const { dir, name } = parsePath(entrypoint);
    return `${dir}${dir ? sep : ""}${name}.${
      process.env.NODEJS_AWS_HANDLER_NAME
    }`;
  }

  return "index";
}

export async function build({
  files,
  entrypoint,
  workPath,
  repoRootPath,
  config = {},
  meta = {},
}: BuildOptions): Promise<BuilderOutput> {
  const shouldAddHelpers = !(
    config.helpers === false || process.env.NODEJS_HELPERS === "0"
  );
  const baseDir = repoRootPath || workPath;
  const awsLambdaHandler = getAWSLambdaHandler(entrypoint, config);

  // ----------------- Prepare build -----------------
  startStep("Prepare build");

  // Validate entrypoint
  // validateEntrypoint(entrypoint);

  startStep("Install devDependencies");
  const {
    entrypointPath,
    entrypointFsDirname,
    nodeVersion,
    spawnOpts,
  } = await downloadInstallAndBundle({
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
  startStep("Ember build");

  const publicPath = "dist";
  // const buildDir = nuxtConfigFile.buildDir ? relative(rootDir, nuxtConfigFile.buildDir) : '.nuxt'

  await exec("yarn", ["build"]);

  // ----------------- Prune dependencies -----------------
  startStep("Prune dependencies");
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
  startStep("Collect artifacts");

  // Client dist files
  const clientDistDir = join(entrypointFsDirname, "dist");
  const clientDistFiles = await globAndPrefix("**", clientDistDir, publicPath);
  consola.log("clientDistDir", clientDistDir);
  consola.log("clientDistFiles", clientDistFiles);

  // node_modules_prod // todo prune node_modules for prod
  const nodeModulesDir = join(entrypointFsDirname, "node_modules");
  const nodeModules = await globAndPrefix("**", nodeModulesDir, "node_modules");

  // Lambdas
  const lambdas: Record<string, Lambda> = {};

  const launcherPath = join(__dirname, "launcher.js");
  const launcherSrc = await fs.readFile(launcherPath, "utf8");

  const launcherFiles = {
    "now__launcher.js": new FileBlob({ data: launcherSrc }),
    "now__bridge.js": new FileFsRef({ fsPath: require("@vercel/node-bridge") }),
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
    const files = await glob(pattern, entrypointFsDirname);
    Object.assign(launcherFiles, files);
  }

  consola.log("launcherFiles: ", launcherFiles);

  // lambdaName will be titled index, unless specified in nuxt.config.js
  lambdas[awsLambdaHandler] = await createLambda({
    handler: "now__launcher.launcher",
    runtime: nodeVersion.runtime,
    files: launcherFiles,
    environment: {
      NODE_ENV: "production",
    },
  });

  // await download(launcherFiles, rootDir)

  endStep();

  consola.log("lambdas: ", lambdas);
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
