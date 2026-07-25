import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { crc32 } from 'node:zlib';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app.ts';

const fixturesPath = path.join(import.meta.dirname, 'fixtures');
const pngFixturePath = path.join(fixturesPath, 'simple-cdef-quarter.png');
const jpegFixturePath = path.join(fixturesPath, 'printed-sample.jpg');
const fakePngFixturePath = path.join(fixturesPath, 'fake-image.png');
const corruptPngFixturePath = path.join(fixturesPath, 'corrupt.png');

const invalidUploadBody = {
  error: {
    code: 'invalid_upload',
    message: 'Upload must be one PNG or JPEG image up to 10 MB.',
  },
};

describe('POST /api/recognitions', () => {
  it('accepts one valid PNG image', async () => {
    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', pngFixturePath);

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      jobId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      ),
      status: 'pending',
    });
  });

  it('accepts one valid JPEG image', async () => {
    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', jpegFixturePath);

    expect(response.status).toBe(202);
    expect(response.body.status).toBe('pending');
    expect(response.body.jobId).toEqual(expect.any(String));
  });

  it('rejects missing files', async () => {
    const response = await request(app).post('/api/recognitions');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });

  it('rejects multiple files', async () => {
    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', pngFixturePath)
      .attach('image', jpegFixturePath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });

  it('rejects wrong field names', async () => {
    const response = await request(app)
      .post('/api/recognitions')
      .attach('score', pngFixturePath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });

  it('rejects oversized files', async () => {
    const oversizedPngHeader = await readFile(pngFixturePath);
    const oversizedUpload = Buffer.concat([
      oversizedPngHeader,
      Buffer.alloc(10 * 1024 * 1024),
    ]);

    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', oversizedUpload, 'large.png');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });

  it('rejects oversized image dimensions', async () => {
    const png = Buffer.from(await readFile(pngFixturePath));
    png.writeUInt32BE(6001, 16);
    png.writeUInt32BE(6001, 20);
    png.writeUInt32BE(crc32(png.subarray(12, 29)), 29);

    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', png, 'too-large.png');

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });

  it('rejects corrupt image files', async () => {
    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', corruptPngFixturePath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });

  it('rejects non-images renamed as PNG files', async () => {
    const response = await request(app)
      .post('/api/recognitions')
      .attach('image', fakePngFixturePath);

    expect(response.status).toBe(400);
    expect(response.body).toEqual(invalidUploadBody);
  });
});
