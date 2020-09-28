/// <reference types="node" />
import { SpawnOptions } from 'child_process';
import { ExecaReturnValue } from 'execa';
import { Files, PackageJson } from '@vercel/build-utils';
import { IOptions } from 'glob';
declare type Mutable<T> = {
    -readonly [P in keyof T]: T[P] extends ReadonlyArray<infer U> ? Mutable<U>[] : Mutable<T[P]>;
};
export declare type MutablePackageJson = Mutable<PackageJson>;
export declare function exec(cmd: string, args: string[], { env, ...opts }?: SpawnOptions): Promise<ExecaReturnValue>;
/**
 * Read in a JSON file with support for UTF-16 fallback.
 */
export declare function readJSON<T = unknown>(filename: string): Promise<T>;
/**
 * Validate if the entrypoint is allowed to be used
 */
export declare function validateEntrypoint(entrypoint: string): void;
export declare function renameFiles(files: Files, renameFn: (fileName: string) => string): Files;
export declare function globAndRename(pattern: string, opts: IOptions | string, renameFn: (fileName: string) => string): Promise<Files>;
export declare function globAndPrefix(pattern: string, opts: IOptions | string, prefix: string): Promise<Files>;
interface NuxtVersion {
    name: string;
    version: string;
    semver: string;
    suffix: string;
    section: string;
}
export declare function findNuxtDep(pkg: MutablePackageJson): void | NuxtVersion;
export declare function preparePkgForProd(pkg: MutablePackageJson): void;
export declare function hrToMs(hr: [number, number]): number;
export declare function endStep(): void;
export declare function startStep(step: string): void;
export {};
