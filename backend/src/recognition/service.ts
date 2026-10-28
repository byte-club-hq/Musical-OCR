import { readFile, writeFile } from 'node:fs/promises';

import type { RecognitionAccepted } from '@musical-ocr/shared';

import { runAudiveris } from '../audiveris/adapter.ts';
import type { AudiverisRunResult } from '../audiveris/types.ts';
import type { AppConfig } from '../config.ts';
import { silentLogger, type Logger } from '../logger.ts';
import { extractMusicXml } from '../musicxml/mxl.ts';
import { summarizePitches } from '../musicxml/pitch-summary.ts';
import {
  cleanupJobWorkspace,
  createJobWorkspace,
} from '../workspaces/job-workspace.ts';
import type { JobWorkspace } from '../workspaces/types.ts';
import { createJobQueue } from './job-queue.ts';
import { createJobStore } from './job-store.ts';
import type { RecognitionError, RecognitionResult } from './types.ts';

type AudiverisFailureReason = Extract<
  AudiverisRunResult,
  { readonly ok: false }
>['reason'];

export type AudiverisRunner = (
  workspace: JobWorkspace,
  inputImagePath: string,
) => Promise<AudiverisRunResult>;

export type RecognitionSubmission = {
  readonly imageBuffer: Buffer;
  readonly mediaType: 'image/png' | 'image/jpeg';
};

export type RecognitionService = {
  // Throws RecognitionBusyError when too many jobs are already waiting.
  readonly submit: (
    submission: RecognitionSubmission,
  ) => Promise<RecognitionAccepted>;
  readonly getJob: (jobId: string) => RecognitionResult | undefined;
  readonly getMusicXml: (jobId: string) => Buffer | undefined;
};

type RecognitionServiceOptions = {
  readonly limits: AppConfig['recognition'];
  readonly audiveris?: AppConfig['audiveris'];
  readonly logger?: Logger;
  // Tests replace these to avoid Docker and to use their own temp folder.
  readonly runAudiveris?: AudiverisRunner;
  readonly createWorkspace?: () => Promise<JobWorkspace>;
};

export class RecognitionBusyError extends Error {}

const genericFailure: RecognitionError = {
  code: 'recognition_failed',
  message: 'Could not process this image.',
};

// Adapter failures carry Docker output; only these codes reach the client.
const publicFailures: Record<AudiverisFailureReason, RecognitionError> = {
  timeout: {
    code: 'recognition_timeout',
    message: 'Recognition took too long. Try a smaller or clearer image.',
  },
  'process-failed': genericFailure,
  'missing-output': {
    code: 'recognition_no_result',
    message: 'No music could be recognized in this image.',
  },
};

export function createRecognitionService({
  limits,
  audiveris,
  logger = silentLogger,
  runAudiveris: runJob = (workspace, inputImagePath) =>
    runAudiveris(workspace, inputImagePath, audiveris),
  createWorkspace = createJobWorkspace,
}: RecognitionServiceOptions): RecognitionService {
  const store = createJobStore(limits.retentionMs);
  const queue = createJobQueue(limits.concurrency);

  const processJob = async (
    workspace: JobWorkspace,
    inputImagePath: string,
  ) => {
    const { jobId } = workspace;
    const startedAt = Date.now();
    store.markProcessing(jobId);

    let outcome: Buffer | RecognitionError;

    try {
      const result = await runJob(workspace, inputImagePath);
      // Read the result into memory so the workspace can go right away.
      outcome = result.ok
        ? await readFile(result.musicXmlPath)
        : publicFailures[result.reason];
    } catch {
      outcome = genericFailure;
    }

    // Delete temp files before reporting the job as finished.
    await cleanupJobWorkspace(workspace).catch(() => {
      logger.warn('recognition.cleanup_failed', { jobId });
    });

    const durationMs = Date.now() - startedAt;

    if (Buffer.isBuffer(outcome)) {
      store.markCompleted(jobId, outcome, summarize(outcome));
      logger.info('recognition.completed', { jobId, durationMs });
    } else {
      store.markFailed(jobId, outcome);
      logger.info('recognition.failed', {
        jobId,
        durationMs,
        code: outcome.code,
      });
    }
  };

  return {
    submit: async ({ imageBuffer, mediaType }) => {
      if (queue.waiting() >= limits.maxQueuedJobs) {
        logger.warn('recognition.busy');
        throw new RecognitionBusyError();
      }

      const workspace = await createWorkspace();
      const inputImagePath =
        mediaType === 'image/png'
          ? workspace.sourcePngPath
          : workspace.sourceJpegPath;

      try {
        await writeFile(inputImagePath, imageBuffer);
      } catch (error) {
        await cleanupJobWorkspace(workspace).catch(() => undefined);
        throw error;
      }

      store.create(workspace.jobId);
      queue.enqueue(() => processJob(workspace, inputImagePath));
      logger.info('recognition.queued', { jobId: workspace.jobId });

      return { jobId: workspace.jobId, status: 'pending' };
    },
    getJob: (jobId) => store.get(jobId),
    getMusicXml: (jobId) => store.getMusicXml(jobId),
  };
}

// The pitch list is a nice-to-have; the MusicXML download is the real result.
function summarize(mxl: Buffer) {
  try {
    return summarizePitches(extractMusicXml(mxl));
  } catch {
    return [];
  }
}
