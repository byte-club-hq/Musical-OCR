import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app.ts';

describe('GET /api/health', () => {
  it('reports that the backend is available', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
