import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { AudiverisRunResult } from '../src/audiveris/types.ts';
import {
  clearRecognitionJobsForTests,
  getRecognitionJob,
  startRecognitionJob,
} from '../src/recognition/jobs.ts';

const pngFixturePath = path.join(
  import.meta.dirname,
  'fixtures',
  'simple-cdef-quarter.png',
);

afterEach(() => {
  clearRecognitionJobsForTests();
});

describe('recognition jobs', () => {
  it('keeps an in-memory job while a background Audiveris run completes', async () => {
    const imageBuffer = await readFile(pngFixturePath);
    const pendingJob = await startRecognitionJob({
      imageBuffer,
      mediaType: 'image/png',
      processInBackground: true,
      runAudiveris: async (workspace, inputImagePath) => {
        expect(inputImagePath).toBe(workspace.sourcePngPath);
        await expect(access(inputImagePath)).resolves.toBeUndefined();

        return {
          ok: true,
          musicXmlPath: workspace.musicXmlPath,
        } satisfies AudiverisRunResult;
      },
    });

    expect(pendingJob.status).toBe('pending');

    const completedJob = await waitForJobStatus(pendingJob.jobId, 'completed');

    expect(completedJob).toMatchObject({
      jobId: pendingJob.jobId,
      status: 'completed',
      pitches: [],
      musicXmlReady: true,
    });
  });

  it('stores a safe failure when Audiveris cannot produce output', async () => {
    const imageBuffer = await readFile(pngFixturePath);
    const pendingJob = await startRecognitionJob({
      imageBuffer,
      mediaType: 'image/png',
      processInBackground: true,
      runAudiveris: async () => ({
        ok: false,
        reason: 'missing-output',
        message: 'Audiveris did not produce MusicXML output',
        exitCode: 0,
        signal: null,
        stdout: '',
        stderr: '',
      }),
    });

    const failedJob = await waitForJobStatus(pendingJob.jobId, 'failed');

    expect(failedJob).toMatchObject({
      jobId: pendingJob.jobId,
      status: 'failed',
      error: {
        code: 'recognition_failed',
        message: 'Could not process this image.',
      },
      musicXmlReady: false,
    });
  });
});

async function waitForJobStatus(jobId: string, status: 'completed' | 'failed') {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const job = getRecognitionJob(jobId);

    if (job?.status === status) {
      return job;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10);
    });
  }

  throw new Error(`Timed out waiting for job ${jobId} to become ${status}`);
}
