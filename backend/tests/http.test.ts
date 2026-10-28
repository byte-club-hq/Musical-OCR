import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.ts';
import { loadConfig } from '../src/config.ts';
import { createErrorHandler } from '../src/http/errors.ts';
import { createLogger } from '../src/logger.ts';

describe('HTTP error handling', () => {
  it('returns JSON for unknown routes', async () => {
    const response = await request(createApp()).get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: {
        code: 'not_found',
        message: 'This API route does not exist.',
      },
    });
  });

  it('hides thrown error details and logs only the error name', async () => {
    const lines: string[] = [];
    const app = express();
    app.get('/boom', () => {
      throw new Error('ENOENT /home/user/secret/path');
    });
    app.use(createErrorHandler(createLogger((line) => lines.push(line))));

    const response = await request(app).get('/boom');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        code: 'internal_error',
        message: 'Something went wrong on the server.',
      },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain('secret');
    expect(JSON.parse(lines[0] ?? '{}')).toMatchObject({
      level: 'error',
      event: 'http.unhandled_error',
      errorName: 'Error',
    });
  });

  it('uses the configured CORS origin', async () => {
    const app = createApp({
      config: { ...loadConfig({}), corsOrigin: 'https://scanner.example' },
    });

    const response = await request(app).get('/api/health');

    expect(response.headers['access-control-allow-origin']).toBe(
      'https://scanner.example',
    );
    expect(response.headers.vary).toContain('Origin');
  });

  it('does not advertise Express', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
