import { FileFsRef, BuildOptions, Lambda, File } from "@vercel/build-utils";
import { Route } from "@vercel/routing-utils";
interface BuilderOutput {
    watch?: string[];
    output: Record<string, Lambda | File | FileFsRef>;
    routes: Route[];
}
export declare function build(opts: BuildOptions): Promise<BuilderOutput>;
export {};
