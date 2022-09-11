import { validate } from 'schema-utils';
import spawn from 'cross-spawn';

const schema = {
  type: "object",
  properties: {
    config: {
      type: "string"
    },
    watch: {
      type: "boolean"
    },
    validate: {
      type: "boolean"
    },
    output: {
      "enum": ["debug", "verbose", "quiet", "quietWithErrors"]
    },
    repersist: {
      type: "boolean"
    }
  },
  "additionalProperties": false
};

const RELAY = "relay-compiler";
const COMPILING = "compiling";
const FAILED = "compilation failed";
class RelayCompiler {
  constructor(args) {
    this.args = args;
  }
  runOnce() {
    var _a, _b;
    this.error = void 0;
    const subprocess = spawn.sync(RELAY, this.args);
    if (((_a = subprocess.stdout) == null ? void 0 : _a.byteLength) > 0) {
      console.log(subprocess.stdout.toString("utf-8"));
    }
    if (((_b = subprocess.stderr) == null ? void 0 : _b.byteLength) > 0) {
      const errorMessage = subprocess.stderr.toString("utf-8");
      if (errorMessage.toLowerCase().includes(FAILED)) {
        this.error = new Error(errorMessage);
      }
    }
    if (this.error === void 0) {
      this.error = subprocess.error;
    }
  }
  watch(callback) {
    var _a, _b, _c, _d;
    if (!this.subprocess) {
      this.subprocess = spawn(RELAY, [...this.args, "--watch"]);
      (_a = this.subprocess.stdout) == null ? void 0 : _a.on("data", (chunk) => {
        if (String(chunk).toLowerCase().includes(COMPILING)) {
          this.error = void 0;
        }
      });
      let failed = false;
      this.subprocess.on("error", (error) => {
        if (!failed) {
          this.error = error;
          failed = true;
          callback == null ? void 0 : callback();
        }
      });
      let errorMessage = "";
      (_b = this.subprocess.stderr) == null ? void 0 : _b.setEncoding("utf-8");
      (_c = this.subprocess.stderr) == null ? void 0 : _c.on("data", (chunk) => {
        errorMessage += chunk;
      });
      (_d = this.subprocess.stderr) == null ? void 0 : _d.on("end", () => {
        if (errorMessage.toLowerCase().includes(FAILED) && !failed) {
          this.error = new Error(errorMessage);
          failed = true;
          callback == null ? void 0 : callback();
        }
      });
    }
  }
  stop() {
    var _a;
    (_a = this.subprocess) == null ? void 0 : _a.kill();
    this.subprocess = void 0;
  }
}

var __getOwnPropSymbols$1 = Object.getOwnPropertySymbols;
var __hasOwnProp$1 = Object.prototype.hasOwnProperty;
var __propIsEnum$1 = Object.prototype.propertyIsEnumerable;
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp$1.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols$1)
    for (var prop of __getOwnPropSymbols$1(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum$1.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};
const WATCHMAN = "watchman";
const checkWatchman = () => {
  const { error } = spawn.sync(WATCHMAN, ["-v"]);
  if (error) {
    console.log("Watchman is not installed. Ignoring watch option...");
    return false;
  }
  return true;
};
const getRelayArgs = (options) => {
  const _a = options, { config, watch } = _a, args = __objRest(_a, ["config", "watch"]);
  let result = [];
  Object.entries(args).forEach(([key, value]) => {
    result.push(`--${key}`);
    if ("boolean" !== typeof value) {
      result.push(`${value}`);
    }
  });
  return config ? [...result, config] : result;
};

var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
const PLUGIN_NAME = "relay-compiler-webpack-plugin";
var OutputKind = /* @__PURE__ */ ((OutputKind2) => {
  OutputKind2["DEBUG"] = "debug";
  OutputKind2["VERBOSE"] = "verbose";
  OutputKind2["QUIET"] = "quiet";
  OutputKind2["QUIET_WITH_ERRORS"] = "quietWithErrors";
  return OutputKind2;
})(OutputKind || {});
const _RelayCompilerPlugin = class {
  constructor(options) {
    const merged = __spreadValues(__spreadValues({}, _RelayCompilerPlugin.defaultOptions), options);
    validate(schema, merged, { name: PLUGIN_NAME });
    this.options = merged;
    this.relayCompiler = new RelayCompiler(getRelayArgs(this.options));
  }
  apply(compiler) {
    if (process.env.NODE_ENV !== "production") {
      this.installErrorHandler(compiler);
      if (this.options.watch && checkWatchman()) {
        this.installWatchHandlers(compiler);
      } else {
        this.installHandlers(compiler);
      }
    }
  }
  installErrorHandler(compiler) {
    compiler.hooks.emit.tapAsync(PLUGIN_NAME, (compilation, next) => {
      if (this.relayCompiler.error !== void 0) {
        compilation.errors.push(this.relayCompiler.error);
      }
      next();
    });
  }
  installWatchHandlers(compiler) {
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      this.relayCompiler.watch(() => {
        var _a, _b;
        (_b = (_a = compiler.root) == null ? void 0 : _a.watching) == null ? void 0 : _b.invalidate();
      });
    });
    compiler.hooks.watchClose.tap(PLUGIN_NAME, () => {
      this.relayCompiler.stop();
    });
  }
  installHandlers(compiler) {
    compiler.hooks.afterEnvironment.tap(PLUGIN_NAME, () => {
      this.relayCompiler.runOnce();
    });
    compiler.hooks.invalid.tap(PLUGIN_NAME, () => {
      this.relayCompiler.runOnce();
    });
  }
};
let RelayCompilerPlugin = _RelayCompilerPlugin;
RelayCompilerPlugin.defaultOptions = { watch: true };

export { OutputKind, RelayCompilerPlugin };
//# sourceMappingURL=index.mjs.map
