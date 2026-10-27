import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AudiverisRunner } from '../src/recognition/service.ts';
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

let tempRoot: Awaited<ReturnType<typeof createTempRoot>>;
let imageBuffer: Buffer;

beforeEach(async () => {
  tempRoot = await createTempRoot();
  imageBuffer = await readFile(pngFixturePath);
});

afterEach(async () => {
  await tempRoot.remove();
});

// Jobs clean up before publishing a final status, so no polling is needed.
async function expectWorkspacesRemoved() {
  expect(await readdir(tempRoot.tempRoot)).toEqual([]);
}

describe('recognition service', () => {
  it('runs an upload through Audiveris and stores the MusicXML', async () => {
    const runner: AudiverisRunner = async (workspace, inputImagePath) => {
      expect(inputImagePath).toBe(workspace.sourcePngPath);
      await expect(access(inputImagePath)).resolves.toBeUndefined();

      return await succeedingAudiveris(workspace, inputImagePath);
    };
    const recognition = createTestRecognition(tempRoot.tempRoot, runner);

    const accepted = await recognition.submit({
      imageBuffer,
      mediaType: 'image/png',
    });

    expect(accepted.status).toBe('pending');
    await vi.waitFor(() => {
      expect(recognition.getJob(accepted.jobId)).toMatchObject({
        status: 'completed',
        pitches: [],
        musicXmlReady: true,
      });
    });
    expect(recognition.getMusicXml(accepted.jobId)).toEqual(fakeMusicXml);
    await expectWorkspacesRemoved();
  });

  it('writes JPEG uploads to the JPEG source path', async () => {
    const inputs: string[] = [];
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      async (workspace, inputImagePath) => {
        inputs.push(path.relative(workspace.rootPath, inputImagePath));

        return await succeedingAudiveris(workspace, inputImagePath);
      },
    );

    const { jobId } = await recognition.submit({
      imageBuffer,
      mediaType: 'image/jpeg',
    });

    await vi.waitFor(() => {
      expect(recognition.getJob(jobId)?.status).toBe('completed');
    });
    expect(inputs).toEqual([path.join('input', 'source.jpg')]);
  });

  it.each([
    ['timeout', 'recognition_timeout'],
    ['process-failed', 'recognition_failed'],
    ['missing-output', 'recognition_no_result'],
  ] as const)(
    'maps an Audiveris %s failure to the safe %s error',
    async (reason, code) => {
      const recognition = createTestRecognition(
        tempRoot.tempRoot,
        failingAudiveris(reason),
      );

      const { jobId } = await recognition.submit({
        imageBuffer,
        mediaType: 'image/png',
      });

      await vi.waitFor(() => {
        expect(recognition.getJob(jobId)).toMatchObject({
          status: 'failed',
          error: { code },
          musicXmlReady: false,
        });
      });
      expect(JSON.stringify(recognition.getJob(jobId))).not.toContain(
        'sensitive',
      );
      expect(recognition.getMusicXml(jobId)).toBeUndefined();
      await expectWorkspacesRemoved();
    },
  );

  it('fails safely when the Audiveris runner throws', async () => {
    const recognition = createTestRecognition(tempRoot.tempRoot, async () => {
      throw new Error('spawn docker ENOENT /home/user/secret');
    });

    const { jobId } = await recognition.submit({
      imageBuffer,
      mediaType: 'image/png',
    });

    await vi.waitFor(() => {
      expect(recognition.getJob(jobId)).toMatchObject({
        status: 'failed',
        error: {
          code: 'recognition_failed',
          message: 'Could not process this image.',
        },
      });
    });
    await expectWorkspacesRemoved();
  });

  it('keeps extra jobs pending until a worker slot frees up', async () => {
    const audiveris = controllableAudiveris();
    const recognition = createTestRecognition(
      tempRoot.tempRoot,
      audiveris.runner,
      1,
    );

    const first = await recognition.submit({
      imageBuffer,
      mediaType: 'image/png',
    });
    const second = await recognition.submit({
      imageBuffer,
      mediaType: 'image/png',
    });

    await vi.waitFor(() => {
      expect(audiveris.started).toHaveLength(1);
    });
    expect(recognition.getJob(first.jobId)?.status).toBe('processing');
    expect(recognition.getJob(second.jobId)?.status).toBe('pending');

    audiveris.releaseAll();
    await vi.waitFor(() => {
      expect(audiveris.started).toHaveLength(2);
    });
    audiveris.releaseAll();

    await vi.waitFor(() => {
      expect(recognition.getJob(second.jobId)?.status).toBe('completed');
    });
    expect(recognition.getJob(first.jobId)?.status).toBe('completed');
  });
});
