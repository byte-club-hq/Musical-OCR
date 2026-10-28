import { resolvePort } from './port.ts';

// All environment variables are read here and nowhere else.
// Keep backend/.env.example in sync when adding one.

export type AppConfig = {
  readonly port: number;
  readonly host: string;
  readonly corsOrigin: string;
  readonly recognition: {
    readonly concurrency: number;
    readonly maxQueuedJobs: number;
    readonly retentionMs: number;
  };
  readonly audiveris: {
    readonly dockerImage: string;
    readonly timeoutMs: number;
  };
};

type Env = Readonly<Record<string, string | undefined>>;

export function loadConfig(env: Env = process.env): AppConfig {
  const int = (name: string, fallback: number) =>
    positiveInt(env, name, fallback);

  return {
    port: resolvePort(env.PORT),
    host: env.HOST ?? '0.0.0.0',
    corsOrigin: env.CORS_ORIGIN ?? '*',
    recognition: {
      concurrency: int('RECOGNITION_CONCURRENCY', 2),
      maxQueuedJobs: int('RECOGNITION_MAX_QUEUED_JOBS', 20),
      retentionMs: int('RECOGNITION_RETENTION_MINUTES', 60) * 60_000,
    },
    audiveris: {
      dockerImage:
        env.AUDIVERIS_IMAGE ?? 'drawliin/musical-ocr-audiveris:5.11.0',
      timeoutMs: int('AUDIVERIS_TIMEOUT_SECONDS', 120) * 1000,
    },
  };
}

function positiveInt(env: Env, name: string, fallback: number): number {
  const value = env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}
