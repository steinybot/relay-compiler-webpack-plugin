import { WebpackPluginInstance, Compiler } from 'webpack';

declare enum OutputKind {
    DEBUG = "debug",
    VERBOSE = "verbose",
    QUIET = "quiet",
    QUIET_WITH_ERRORS = "quietWithErrors"
}
interface RelayCompilerPluginOptions {
    config?: string;
    watch?: boolean;
    validate?: boolean;
    output?: OutputKind;
    repersist?: boolean;
}
declare class RelayCompilerPlugin implements WebpackPluginInstance {
    static defaultOptions: RelayCompilerPluginOptions;
    private options;
    private relayCompiler;
    constructor(options: RelayCompilerPluginOptions);
    apply(compiler: Compiler): void;
    private installErrorHandler;
    private installWatchHandlers;
    private installHandlers;
}

export { OutputKind, RelayCompilerPlugin, RelayCompilerPluginOptions };
