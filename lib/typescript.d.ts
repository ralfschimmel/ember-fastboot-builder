/// <reference types="node" />
import { SpawnOptions } from 'child_process';
import { FileFsRef, PackageJson } from '@vercel/build-utils';
export interface JsonOptions {
    [key: string]: number | boolean | string | Array<number | boolean | string>;
}
interface CompileTypescriptOptions {
    spawnOpts: SpawnOptions;
    rootDir: string;
    tscOptions?: JsonOptions;
}
interface PrepareTypescriptOptions {
    pkg: PackageJson;
    spawnOpts: SpawnOptions;
    rootDir: string;
}
export declare function prepareTypescriptEnvironment({ pkg, spawnOpts, rootDir }: PrepareTypescriptOptions): Promise<void>;
export declare function compileTypescriptBuildFiles({ rootDir, spawnOpts, tscOptions }: CompileTypescriptOptions): Promise<{
    [filePath: string]: FileFsRef;
}>;
export {};
