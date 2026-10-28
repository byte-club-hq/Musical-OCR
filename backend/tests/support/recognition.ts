import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { strToU8, zipSync } from 'fflate';

import type { AudiverisRunResult } from '../../src/audiveris/types.ts';
import {
  createRecognitionService,
  type AudiverisRunner,
} from '../../src/recognition/service.ts';
import { createJobWorkspace } from '../../src/workspaces/job-workspace.ts';
import type { JobWorkspace } from '../../src/workspaces/types.ts';

export const fakeScoreXml =
  '<?xml version="1.0"?><score-partwise version="4.0"/>';

// A minimal but valid .mxl archive, shaped like Audiveris output.
export const fakeMusicXml = Buffer.from(
  zipSync({
    'META-INF/container.xml': strToU8(
      '<container><rootfiles><rootfile full-path="source.xml"/></rootfiles></container>',
    ),
    'source.xml': strToU8(fakeScoreXml),
  }),
);

// Stands in for Docker: writes the canonical result file like the real adapter.
export const succeedingAudiveris: AudiverisRunner = async (workspace) => {
  await writeFile(workspace.musicXmlPath, fakeMusicXml);

  return { ok: true, musicXmlPath: workspace.musicXmlPath };
};

export function failingAudiveris(
  reason: Extract<AudiverisRunResult, { readonly ok: false }>['reason'],
): AudiverisRunner {
  return async () => ({
    ok: false,
    reason,
    message: 'Audiveris failed',
    exitCode: 1,
    signal: null,
    stdout: 'sensitive stdout',
    stderr: 'sensitive stderr',
  });
}

// An Audiveris run that waits until the test releases it, so tests can observe
// jobs while they are still pending or processing.
export function controllableAudiveris() {
  const started: JobWorkspace[] = [];
  const releases: Array<() => void> = [];

  const runner: AudiverisRunner = async (workspace, inputImagePath) => {
    started.push(workspace);
    await new Promise<void>((resolve) => {
      releases.push(resolve);
    });

    return await succeedingAudiveris(workspace, inputImagePath);
  };

  return {
    runner,
    started,
    releaseAll: () => {
      releases.splice(0).forEach((release) => {
        release();
      });
    },
  };
}

export async function createTempRoot(): Promise<{
  readonly tempRoot: string;
  readonly remove: () => Promise<void>;
}> {
  const tempRoot = await mkdtemp(
    path.join(tmpdir(), 'musical-ocr-recognition-test-'),
  );

  return {
    tempRoot,
    // Background jobs may still be deleting their own workspace, which Windows
    // reports as EPERM/ENOTEMPTY; rm retries those errors.
    remove: () =>
      rm(tempRoot, {
        recursive: true,
        force: true,
        maxRetries: 10,
        retryDelay: 20,
      }),
  };
}

export function createTestRecognition(
  tempRoot: string,
  runAudiveris: AudiverisRunner,
  concurrency = 2,
  maxQueuedJobs = 20,
) {
  return createRecognitionService({
    runAudiveris,
    limits: { concurrency, maxQueuedJobs, retentionMs: 60_000 },
    createWorkspace: () => createJobWorkspace({ tempRoot }),
  });
}
