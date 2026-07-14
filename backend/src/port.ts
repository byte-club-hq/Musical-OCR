const DEFAULT_PORT = 3000;
const MAX_PORT = 65_535;
const INVALID_PORT_MESSAGE = 'PORT must be an integer between 1 and 65535';

export function resolvePort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(INVALID_PORT_MESSAGE);
  }

  const port = Number(value);

  if (!Number.isSafeInteger(port) || port < 1 || port > MAX_PORT) {
    throw new Error(INVALID_PORT_MESSAGE);
  }

  return port;
}
