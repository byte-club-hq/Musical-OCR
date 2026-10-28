// Structured, privacy-safe logging: one JSON object per line.
//
// Rules for every log call:
// - log stable event names (`recognition.completed`) plus small fields such as
//   job ids, error codes, counts, and durations;
// - never log image bytes, user-provided filenames, filesystem paths, or raw
//   Audiveris/Docker output. Those belong in opt-in diagnostics.

type LogValue = string | number | boolean;
type LogFields = Readonly<Record<string, LogValue>>;
type LogLevel = 'info' | 'warn' | 'error';

export type Logger = {
  readonly info: (event: string, fields?: LogFields) => void;
  readonly warn: (event: string, fields?: LogFields) => void;
  readonly error: (event: string, fields?: LogFields) => void;
};

export function createLogger(
  write: (line: string) => void = (line) => {
    process.stdout.write(`${line}\n`);
  },
): Logger {
  const log = (level: LogLevel, event: string, fields: LogFields = {}) => {
    write(
      JSON.stringify({
        time: new Date().toISOString(),
        level,
        event,
        ...fields,
      }),
    );
  };

  return {
    info: (event, fields) => log('info', event, fields),
    warn: (event, fields) => log('warn', event, fields),
    error: (event, fields) => log('error', event, fields),
  };
}

export const silentLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
