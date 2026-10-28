import { resolvePort } from './port.ts';

// Every environment variable the backend reads is parsed here, once, at
// startup. Other modules receive plain typed values and never touch
// process.env, so tests can build any configuration without globals.
//
// Document new variables in backend/.env.example and ARCHITECTURE.md.

export type AppConfig = {
  readonly port: number;
  readonly host: string;
  // Value of Access-Control-Allow-Origin. `*` suits local development; set a
  // concrete origin (for example https://scanner.example) for deployments.
  readonly corsOrigin: string;
  readonly recognition: {
    // How many Audiveris runs may happen at once.
    readonly concurrency: number;
    // How many accepted jobs may wait for a free slot before uploads get 503.
    readonly maxQueuedJobs: number;
    // How long finished jobs and their MusicXML stay downloadable.
    readonly retentionMs: number;
  };
  readonly audiveris: {
    readonly dockerImage: string;
    readonly timeoutMs: number;
  };
};

type Env = Readonly<Record<string, string | undefined>>;

export function loadConfig(env: Env = process.env): AppConfig {
  return {
    port: resolvePort(env.PORT),
    host: env.HOST ?? '0.0.0.0',
    corsOrigin: env.CORS_ORIGIN ?? '*',
    recognition: {
      concurrency: readPositiveInteger(env, 'RECOGNITION_CONCURRENCY', 2),
      maxQueuedJobs: readPositiveInteger(
        env,
        'RECOGNITION_MAX_QUEUED_JOBS',
        20,
      ),
      retentionMs:
        readPositiveInteger(env, 'RECOGNITION_RETENTION_MINUTES', 60) * 60_000,
    },
    audiveris: {
      dockerImage:
        env.AUDIVERIS_IMAGE ?? 'drawliin/musical-ocr-audiveris:5.11.0',
      timeoutMs:
        readPositiveInteger(env, 'AUDIVERIS_TIMEOUT_SECONDS', 120) * 1000,
    },
  };
}

function readPositiveInteger(env: Env, name: string, fallback: number): number {
  const value = env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  // Fail at startup instead of running with a silently wrong limit.
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }

  return parsed;
}
