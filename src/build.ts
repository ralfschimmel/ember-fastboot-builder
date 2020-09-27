import path from "path";
import fs from "fs-extra";
import consola from "consola";
import execa from 'execa'

import {
  createLambda,
  download,
  FileFsRef,
  FileBlob,
  glob,
  getNodeVersion,
  getSpawnOptions,
  BuildOptions,
  Lambda,
  File,
} from "@vercel/build-utils";
import { Route } from "@vercel/routing-utils";

import {
  exec,
  validateEntrypoint,
  globAndPrefix,
  // preparePkgForProd,
  startStep,
  endStep,
  MutablePackageJson,
  readJSON,
} from "./utils";

interface BuilderOutput {
  watch?: string[];
  output: Record<string, Lambda | File | FileFsRef>;
  routes: Route[];
}

export async function build({
  files,
  entrypoint,
  workPath,
  config = {},
  meta = {},
}: BuildOptions): Promise<BuilderOutput> {
  // ----------------- Prepare build -----------------
  startStep("Prepare build");

  // Validate entrypoint
  validateEntrypoint(entrypoint);

  // Entry directory
  const entryDir = path.dirname(entrypoint);
  consola.log("entryDir:", entryDir);

  // Compute rootDir
  const rootDir = path.join(workPath, entryDir);
  consola.log("rootDir:", rootDir);

  // Create a real filesystem
  consola.log("Downloading files...");
  await download(files, workPath, meta);

  // Change cwd to rootDir
  process.chdir(rootDir);
  consola.log("Working directory:", process.cwd());

  // Read package.json
  let pkg: MutablePackageJson;
  try {
    pkg = await readJSON("package.json");
  } catch (e) {
    throw new Error(`Can not read package.json from ${rootDir}`);
  }

  // Node version
  const nodeVersion = await getNodeVersion(rootDir, undefined, config, meta);
  consola.log("nodeVersion: ", nodeVersion);
  consola.log("meta: ", meta);
  const spawnOpts = getSpawnOptions(meta, nodeVersion);
  // consola.log("spawnOpts.env: ",spawnOpts.env);
  consola.log(await execa("node", ["-v"]));

  // Detect npm (prefer yarn)
  const isYarn = !fs.existsSync("package-lock.json");
  consola.log("Using", isYarn ? "yarn" : "npm");

  // Write .npmrc
  if (process.env.NPM_AUTH_TOKEN) {
    consola.log("Found NPM_AUTH_TOKEN in environment, creating .npmrc");
    await fs.writeFile(
      ".npmrc",
      `//registry.npmjs.org/:_authToken=${process.env.NPM_AUTH_TOKEN}`
    );
  }

  // Write .yarnclean
  if (isYarn && !fs.existsSync(".yarnclean")) {
    await fs.copyFile(path.join(__dirname, ".yarnclean"), ".yarnclean");
  }

  // Cache dir
  const cacheDir = path.resolve(rootDir, ".now_cache");
  await fs.mkdirp(cacheDir);

  const yarnCacheDir = path.join(cacheDir, "yarn");
  await fs.mkdirp(yarnCacheDir);

  // ----------------- Install devDependencies -----------------
  startStep("Install devDependencies");

  // Install all dependencies
  await exec(
    "yarn",
    [
      "install",
      "--prefer-offline",
      "--pure-lockfile",
      "--frozen-lockfile",
      "--non-interactive",
      "--production=false",
      `--modules-folder=${rootDir}/node_modules`,
      `--cache-folder=${yarnCacheDir}`,
    ],
    { ...spawnOpts, env: { ...spawnOpts.env, NODE_ENV: "development" } }
  );

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
  // const buildDir = nuxtConfigFile.buildDir ? path.relative(rootDir, nuxtConfigFile.buildDir) : '.nuxt'
  const lambdaName = "index";

  await exec("yarn", ["build"]);

  // ----------------- Install dependencies -----------------
  startStep("Install dependencies");

  // Only keep core dependency
  // preparePkgForProd(pkg);
  // await fs.writeJSON("package.json", pkg);

  await exec(
    "yarn",
    [
      "install",
      "--prefer-offline",
      "--pure-lockfile",
      "--non-interactive",
      "--production=true",
      `--modules-folder=${rootDir}/node_modules`,
      `--cache-folder=${yarnCacheDir}`,
    ],
    spawnOpts
  );

  // Cleanup .npmrc
  if (process.env.NPM_AUTH_TOKEN) {
    await fs.unlink(".npmrc");
  }

  // ----------------- Collect artifacts -----------------
  startStep("Collect artifacts");

  // Client dist files
  const clientDistDir = path.join(rootDir, "dist");
  const clientDistFiles = await globAndPrefix("**", clientDistDir, publicPath);
  consola.log('clientDistDir', clientDistDir);
  consola.log('clientDistFiles', clientDistFiles);


  // node_modules_prod // todo prune node_modules for prod
  const nodeModulesDir = path.join(rootDir, "node_modules");
  const nodeModules = await globAndPrefix("**", nodeModulesDir, "node_modules");

  // Lambdas
  const lambdas: Record<string, Lambda> = {};

  const launcherPath = path.join(__dirname, "launcher.js");
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
    const files = await glob(pattern, rootDir);
    Object.assign(launcherFiles, files);
  }

  consola.log('launcherFiles: ', launcherFiles);

  // lambdaName will be titled index, unless specified in nuxt.config.js
  lambdas[lambdaName] = await createLambda({
    handler: "now__launcher.launcher",
    runtime: nodeVersion.runtime,
    files: launcherFiles,
    environment: {
      NODE_ENV: "production",
    },
  });

  // await download(launcherFiles, rootDir)

  endStep();

  consola.log('lambdas: ', lambdas);
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