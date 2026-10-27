import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app.ts';

describe('GET /api/health', () => {
  it('reports that the backend is available', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'https://example.test');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('OPTIONS preflight', () => {
  it('allows requests from any origin', async () => {
    const response = await request(app)
      .options('/api/recognitions')
      .set('Origin', 'https://friend-device.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['access-control-allow-methods']).toBe(
      'GET,POST,OPTIONS',
    );
    expect(response.headers['access-control-allow-headers']).toBe(
      'content-type',
    );
  });
});
