// src/logger/logger.ts
import log from "electron-log/main";
import path from "path";
import { app } from "electron";

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath("userData"), "logs", "strix.log");

log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB then rotates
log.transports.file.level = "debug";
log.transports.console.level = "debug";        // still shows in DevTools

// Structured child logger — attach fixed context to every line
export function createLogger(context: Record<string, string>) {
  return {
    debug: (msg: string, extra?: object) =>
      log.debug({ ...context, ...extra, msg }),
    info:  (msg: string, extra?: object) =>
      log.info({ ...context, ...extra, msg }),
    warn:  (msg: string, extra?: object) =>
      log.warn({ ...context, ...extra, msg }),
    error: (msg: string, err?: unknown, extra?: object) =>
      log.error({ ...context, ...extra, msg, err: serializeError(err) }),
  };
}

function serializeError(err: unknown) {
  if (!err) return undefined;
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return String(err);
}

export default log;