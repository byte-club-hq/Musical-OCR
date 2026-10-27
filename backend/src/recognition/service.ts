import { readFile, writeFile } from 'node:fs/promises';

import { runAudiveris } from '../audiveris/adapter.ts';
import type { AudiverisRunResult } from '../audiveris/types.ts';
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
  readonly submit: (
    submission: RecognitionSubmission,
  ) => Promise<{ readonly jobId: string; readonly status: 'pending' }>;
  readonly getJob: (jobId: string) => RecognitionResult | undefined;
  readonly getMusicXml: (jobId: string) => Buffer | undefined;
};

type RecognitionServiceOptions = {
  readonly store?: RecognitionJobStore;
  readonly queue?: JobQueue;
  readonly runAudiveris?: AudiverisRunner;
  readonly createWorkspace?: () => Promise<JobWorkspace>;
};

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
  const store = options.store ?? createJobStore();
  const queue = options.queue ?? createJobQueue();
  const runAudiverisForJob = options.runAudiveris ?? runAudiveris;
  const createWorkspace = options.createWorkspace ?? createJobWorkspace;

  const processJob = async (
    workspace: JobWorkspace,
    inputImagePath: string,
  ) => {
    store.markProcessing(workspace.jobId);

    let outcome: Buffer | RecognitionError;

    try {
      const result = await runAudiverisForJob(workspace, inputImagePath);

      // Keep the bytes in memory so the workspace can be deleted right away;
      // the download endpoint never touches the filesystem.
      outcome = result.ok
        ? await readFile(result.musicXmlPath)
        : publicFailures[result.reason];
    } catch {
      outcome = genericFailure;
    }

    // Clean up before publishing the final status, so a finished job never
    // has temp files left behind.
    await cleanupJobWorkspace(workspace).catch(() => undefined);

    if (Buffer.isBuffer(outcome)) {
      store.markCompleted(workspace.jobId, outcome, []);
    } else {
      store.markFailed(workspace.jobId, outcome);
    }
  };

  return {
    submit: async ({ imageBuffer, mediaType }) => {
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

      return { jobId: workspace.jobId, status: 'pending' };
    },
    getJob: (jobId) => store.get(jobId),
    getMusicXml: (jobId) => store.getMusicXml(jobId),
  };
}
