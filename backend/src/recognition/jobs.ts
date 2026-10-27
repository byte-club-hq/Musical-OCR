import { writeFile } from 'node:fs/promises';

import { runAudiveris } from '../audiveris/adapter.ts';
import type { AudiverisRunResult } from '../audiveris/types.ts';
import {
  cleanupJobWorkspace,
  createJobWorkspace,
} from '../workspaces/job-workspace.ts';
import type { JobWorkspace } from '../workspaces/types.ts';
import type { RecognitionResult } from './types.ts';

type UploadedImageMediaType = 'image/png' | 'image/jpeg';
type PendingRecognitionResult = Extract<
  RecognitionResult,
  { readonly status: 'pending' }
>;
type AudiverisRunner = (
  workspace: JobWorkspace,
  inputImagePath: string,
) => Promise<AudiverisRunResult>;

export type StartRecognitionJobOptions = {
  readonly imageBuffer: Buffer;
  readonly mediaType: UploadedImageMediaType;
  readonly runAudiveris?: AudiverisRunner;
  readonly processInBackground?: boolean;
};

const jobs = new Map<string, RecognitionResult>();

export async function startRecognitionJob({
  imageBuffer,
  mediaType,
  runAudiveris: runAudiverisForJob = runAudiveris,
  processInBackground = process.env.NODE_ENV !== 'test',
}: StartRecognitionJobOptions): Promise<PendingRecognitionResult> {
  const workspace = await createJobWorkspace();
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

  const now = new Date().toISOString();
  const pendingJob: PendingRecognitionResult = {
    jobId: workspace.jobId,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };
  jobs.set(pendingJob.jobId, pendingJob);

  if (processInBackground) {
    void processRecognitionJob(workspace, inputImagePath, runAudiverisForJob);
  } else {
    await cleanupJobWorkspace(workspace).catch(() => undefined);
  }

  return pendingJob;
}

export function getRecognitionJob(
  jobId: string,
): RecognitionResult | undefined {
  return jobs.get(jobId);
}

export function clearRecognitionJobsForTests(): void {
  jobs.clear();
}

async function processRecognitionJob(
  workspace: JobWorkspace,
  inputImagePath: string,
  runAudiverisForJob: AudiverisRunner,
): Promise<void> {
  const currentJob = jobs.get(workspace.jobId);

  if (!currentJob) {
    return;
  }

  jobs.set(workspace.jobId, {
    ...currentJob,
    status: 'processing',
    updatedAt: new Date().toISOString(),
  });

  try {
    const result = await runAudiverisForJob(workspace, inputImagePath);

    jobs.set(
      workspace.jobId,
      result.ok ? completedJob(workspace.jobId) : failedJob(workspace.jobId),
    );
  } catch {
    jobs.set(workspace.jobId, failedJob(workspace.jobId));
  } finally {
    // await cleanupJobWorkspace(workspace).catch(() => undefined);
  }
}

function completedJob(jobId: string): RecognitionResult {
  return {
    jobId,
    status: 'completed',
    createdAt: jobs.get(jobId)?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // ponytail: until MusicXML parsing exists, completed demo jobs only prove
    // the Audiveris workflow ran; replace this with parsed pitches later.
    pitches: [],
    musicXmlReady: true,
  };
}

function failedJob(jobId: string): RecognitionResult {
  return {
    jobId,
    status: 'failed',
    createdAt: jobs.get(jobId)?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    error: {
      code: 'recognition_failed',
      message: 'Could not process this image.',
    },
    musicXmlReady: false,
  };
}
