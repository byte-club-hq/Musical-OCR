import path from 'node:path';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createApp } from '../src/app.ts';
import type { RecognitionService } from '../src/recognition/service.ts';
import {
  controllableAudiveris,
  createTempRoot,
  createTestRecognition,
  failingAudiveris,
  fakeMusicXml,
  succeedingAudiveris,
} from './support/recognition.ts';

const pngFixturePath = path.join(
  import.meta.dirname,
  'fixtures',
  'simple-cdef-quarter.png',
);

const notFoundBody = {
  error: {
    code: 'recognition_not_found',
    message: 'Recognition job was not found.',
  },
};

let tempRoot: Awaited<ReturnType<typeof createTempRoot>>;

beforeEach(async () => {
  tempRoot = await createTempRoot();
});

afterEach(async () => {
  await tempRoot.remove();
});

async function uploadAndWait(
  recognition: RecognitionService,
  status: 'processing' | 'completed' | 'failed',
) {
  const app = createApp({ recognition });
  const upload = await request(app)
    .post('/api/recognitions')
    .attach('image', pngFixturePath);
  const jobId: string = upload.body.jobId;

  await vi.waitFor(() => {
    expect(recognition.getJob(jobId)?.status).toBe(status);
  });

  return { app, jobId };
}

describe('GET /api/health', () => {
  it('reports that the backend is available', async () => {
    const response = await request(createApp())
      .get('/api/health')
      .set('Origin', 'https://example.test');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['content-type']).toMatch(/^application\/json/);
    expect(response.body).toEqual({ status: 'ok' });
  });
});

describe('GET /api/recognitions/:id', () => {
  it('returns a safe not found error for unknown jobs', async () => {
    const response = await request(createApp()).get(
      '/api/recognitions/missing-job',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
  });

  it('reports pending and processing jobs', async () => {
    const audiveris = controllableAudiveris();
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      audiveris.runner,
      1,
    );
    const { app, jobId: processingJobId } = await uploadAndWait(
      recognition,
      'processing',
    );
    const queued = await request(app)
      .post('/api/recognitions')
      .attach('image', pngFixturePath);

    const processing = await request(app).get(
      `/api/recognitions/${processingJobId}`,
    );
    const pending = await request(app).get(
      `/api/recognitions/${queued.body.jobId}`,
    );

    expect(processing.status).toBe(200);
    expect(processing.body).toMatchObject({
      jobId: processingJobId,
      status: 'processing',
    });
    expect(pending.body).toMatchObject({
      jobId: queued.body.jobId,
      status: 'pending',
    });

    audiveris.releaseAll();
    await vi.waitFor(() => {
      expect(audiveris.started).toHaveLength(2);
    });
    audiveris.releaseAll();
    await vi.waitFor(() => {
      expect(recognition.getJob(queued.body.jobId)?.status).toBe('completed');
    });
  });

  it('reports completed jobs', async () => {
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      succeedingAudiveris,
    );
    const { app, jobId } = await uploadAndWait(recognition, 'completed');

    const response = await request(app).get(`/api/recognitions/${jobId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      jobId,
      status: 'completed',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      pitches: [],
      musicXmlReady: true,
    });
  });

  it('reports failed jobs with a safe error', async () => {
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      failingAudiveris('timeout'),
    );
    const { app, jobId } = await uploadAndWait(recognition, 'failed');

    const response = await request(app).get(`/api/recognitions/${jobId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      jobId,
      status: 'failed',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      error: {
        code: 'recognition_timeout',
        message: 'Recognition took too long. Try a smaller or clearer image.',
      },
      musicXmlReady: false,
    });
  });
});

describe('GET /api/recognitions/:id/musicxml', () => {
  it('downloads the stored MusicXML for completed jobs', async () => {
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      succeedingAudiveris,
    );
    const { app, jobId } = await uploadAndWait(recognition, 'completed');

    const response = await request(app)
      .get(`/api/recognitions/${jobId}/musicxml`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          callback(null, Buffer.concat(chunks));
        });
      });

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe(
      'application/vnd.recordare.musicxml',
    );
    expect(response.headers['content-disposition']).toBe(
      'attachment; filename="sheet-music.mxl"',
    );
    expect(response.body).toEqual(fakeMusicXml);
  });

  it('reports that MusicXML is not ready for unfinished jobs', async () => {
    const audiveris = controllableAudiveris();
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      audiveris.runner,
    );
    const { app, jobId } = await uploadAndWait(recognition, 'processing');

    const response = await request(app).get(
      `/api/recognitions/${jobId}/musicxml`,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('musicxml_not_ready');

    audiveris.releaseAll();
    await vi.waitFor(() => {
      expect(recognition.getJob(jobId)?.status).toBe('completed');
    });
  });

  it('reports that failed jobs have no MusicXML', async () => {
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      failingAudiveris('missing-output'),
    );
    const { app, jobId } = await uploadAndWait(recognition, 'failed');

    const response = await request(app).get(
      `/api/recognitions/${jobId}/musicxml`,
    );

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('musicxml_unavailable');
  });

  it('returns a safe not found error for unknown jobs', async () => {
    const response = await request(createApp()).get(
      '/api/recognitions/missing-job/musicxml',
    );

    expect(response.status).toBe(404);
    expect(response.body).toEqual(notFoundBody);
  });
});

describe('OPTIONS preflight', () => {
  it('allows requests from any origin', async () => {
    const response = await request(createApp())
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
