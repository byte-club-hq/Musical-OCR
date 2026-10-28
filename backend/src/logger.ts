// JSON-lines logger. Log event names plus ids, codes, counts, and durations.
// Never log image bytes, user filenames, filesystem paths, or Audiveris output.

type LogFields = Readonly<Record<string, string | number | boolean>>;

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
  const log =
    (level: string) =>
    (event: string, fields: LogFields = {}) => {
      write(
        JSON.stringify({
          time: new Date().toISOString(),
          level,
          event,
          ...fields,
        }),
      );
    };

  return { info: log('info'), warn: log('warn'), error: log('error') };
}

export const silentLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};
