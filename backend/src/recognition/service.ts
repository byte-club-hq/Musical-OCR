import { readFile, writeFile } from 'node:fs/promises';

import type { PitchItem } from '@musical-ocr/shared';

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
import { createJobQueue, type JobQueue } from './job-queue.ts';
import { createJobStore, type RecognitionJobStore } from './job-store.ts';
import type { RecognitionError, RecognitionResult } from './types.ts';

type UploadedImageMediaType = 'image/png' | 'image/jpeg';
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
  readonly mediaType: UploadedImageMediaType;
};

export type RecognitionService = {
  // Throws RecognitionBusyError when the waiting queue is full.
  readonly submit: (
    submission: RecognitionSubmission,
  ) => Promise<{ readonly jobId: string; readonly status: 'pending' }>;
  readonly getJob: (jobId: string) => RecognitionResult | undefined;
  readonly getMusicXml: (jobId: string) => Buffer | undefined;
};

type RecognitionServiceOptions = {
  readonly limits?: Partial<AppConfig['recognition']>;
  readonly audiveris?: AppConfig['audiveris'];
  readonly logger?: Logger;
  // Test seams: replace the real store, queue, Docker run, or temp folders.
  readonly store?: RecognitionJobStore;
  readonly queue?: JobQueue;
  readonly runAudiveris?: AudiverisRunner;
  readonly createWorkspace?: () => Promise<JobWorkspace>;
};

export class RecognitionBusyError extends Error {
  constructor() {
    super('Recognition queue is full');
    this.name = 'RecognitionBusyError';
  }
}

const DEFAULT_MAX_QUEUED_JOBS = 20;

const genericFailure: RecognitionError = {
  code: 'recognition_failed',
  message: 'Could not process this image.',
};

// Adapter failures carry Docker output and exit codes. Only these stable codes
// and messages ever reach the client.
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

export function createRecognitionService(
  options: RecognitionServiceOptions = {},
): RecognitionService {
  const logger = options.logger ?? silentLogger;
  const store =
    options.store ??
    createJobStore(
      options.limits?.retentionMs === undefined
        ? {}
        : { retentionMs: options.limits.retentionMs },
    );
  const queue = options.queue ?? createJobQueue(options.limits?.concurrency);
  const maxQueuedJobs =
    options.limits?.maxQueuedJobs ?? DEFAULT_MAX_QUEUED_JOBS;
  const audiverisOptions = options.audiveris;
  const runAudiverisForJob: AudiverisRunner =
    options.runAudiveris ??
    ((workspace, inputImagePath) =>
      runAudiveris(workspace, inputImagePath, audiverisOptions ?? {}));
  const createWorkspace = options.createWorkspace ?? createJobWorkspace;

  const processJob = async (
    workspace: JobWorkspace,
    inputImagePath: string,
  ) => {
    const { jobId } = workspace;
    const startedAt = Date.now();
    store.markProcessing(jobId);
    logger.info('recognition.started', { jobId });

    let outcome: Buffer | RecognitionError;

    try {
      const result = await runAudiverisForJob(workspace, inputImagePath);

      if (!result.ok) {
        logger.warn('recognition.audiveris_failed', {
          jobId,
          reason: result.reason,
        });
      }

      // Keep the bytes in memory so the workspace can be deleted right away;
      // the download endpoint never touches the filesystem.
      outcome = result.ok
        ? await readFile(result.musicXmlPath)
        : publicFailures[result.reason];
    } catch (error) {
      logger.error('recognition.crashed', {
        jobId,
        errorName: error instanceof Error ? error.name : typeof error,
      });
      outcome = genericFailure;
    }

    // Clean up before publishing the final status, so a finished job never
    // has temp files left behind.
    await cleanupJobWorkspace(workspace).catch(() => {
      logger.warn('recognition.cleanup_failed', { jobId });
    });

    const durationMs = Date.now() - startedAt;

    if (Buffer.isBuffer(outcome)) {
      const pitches = summarizeSafely(outcome, jobId, logger);
      store.markCompleted(jobId, outcome, pitches);
      logger.info('recognition.completed', {
        jobId,
        durationMs,
        pitchCount: pitches.length,
      });
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
      // Refuse new work before touching the disk when the backlog is full.
      if (queue.waiting() >= maxQueuedJobs) {
        logger.warn('recognition.busy', { waiting: queue.waiting() });
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
      logger.info('recognition.queued', {
        jobId: workspace.jobId,
        mediaType,
        waiting: queue.waiting(),
      });

      return { jobId: workspace.jobId, status: 'pending' };
    },
    getJob: (jobId) => store.get(jobId),
    getMusicXml: (jobId) => store.getMusicXml(jobId),
  };
}

// The pitch summary is a convenience view. If it cannot be built, the job
// still completes: the MusicXML download is the real result.
function summarizeSafely(
  mxl: Buffer,
  jobId: string,
  logger: Logger,
): PitchItem[] {
  try {
    return summarizePitches(extractMusicXml(mxl));
  } catch (error) {
    logger.warn('recognition.summary_failed', {
      jobId,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    return [];
  }
}
