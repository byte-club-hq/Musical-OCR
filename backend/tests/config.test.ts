import { describe, expect, it } from 'vitest';

import { loadConfig } from '../src/config.ts';

describe('loadConfig', () => {
  it('uses development defaults when nothing is set', () => {
    expect(loadConfig({})).toEqual({
      port: 3000,
      host: '0.0.0.0',
      corsOrigin: '*',
      recognition: {
        concurrency: 2,
        maxQueuedJobs: 20,
        retentionMs: 60 * 60_000,
      },
      audiveris: {
        dockerImage: 'drawliin/musical-ocr-audiveris:5.11.0',
        timeoutMs: 120_000,
      },
    });
  });

  it('reads every supported variable', () => {
    expect(
      loadConfig({
        PORT: '4000',
        HOST: '127.0.0.1',
        CORS_ORIGIN: 'https://scanner.example',
        RECOGNITION_CONCURRENCY: '4',
        RECOGNITION_MAX_QUEUED_JOBS: '50',
        RECOGNITION_RETENTION_MINUTES: '10',
        AUDIVERIS_IMAGE: 'custom/audiveris:dev',
        AUDIVERIS_TIMEOUT_SECONDS: '300',
      }),
    ).toEqual({
      port: 4000,
      host: '127.0.0.1',
      corsOrigin: 'https://scanner.example',
      recognition: {
        concurrency: 4,
        maxQueuedJobs: 50,
        retentionMs: 10 * 60_000,
      },
      audiveris: {
        dockerImage: 'custom/audiveris:dev',
        timeoutMs: 300_000,
      },
    });
  });

  it.each(['0', '-1', '1.5', 'two'])(
    'rejects RECOGNITION_CONCURRENCY=%j',
    (value) => {
      expect(() => loadConfig({ RECOGNITION_CONCURRENCY: value })).toThrow(
        'RECOGNITION_CONCURRENCY must be a positive integer',
      );
    },
  );
});
