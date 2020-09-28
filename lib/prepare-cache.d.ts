import { PrepareCacheOptions, FileRef } from '@vercel/build-utils';
declare function prepareCache({ workPath, entrypoint }: PrepareCacheOptions): Promise<Record<string, FileRef>>;
export default prepareCache;
