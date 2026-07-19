import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { JobWorkspace } from './types.ts';

const DEFAULT_TEMP_ROOT = path.join(tmpdir(), 'musical-ocr');
const SAFE_JOB_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export async function createJobWorkspace(
  options: {
    readonly jobId?: string;
    readonly tempRoot?: string;
  } = {},
): Promise<JobWorkspace> {
  const jobId = resolveSafeJobId(options.jobId);

  // Use the OS temp area so generated files do not live inside the repository
  // and work the same way on Windows, macOS, and Linux.
  const tempRoot = path.resolve(options.tempRoot ?? DEFAULT_TEMP_ROOT);
  const rootPath = path.resolve(tempRoot, jobId);
  assertInsideTempRoot(tempRoot, rootPath);

  const inputDir = path.join(rootPath, 'input');
  const outputDir = path.join(rootPath, 'output');

  await mkdir(tempRoot, { recursive: true });
  await mkdir(rootPath);
  await mkdir(inputDir);
  await mkdir(outputDir);

  return {
    jobId,
    rootPath,
    inputDir,
    outputDir,
    sourcePngPath: path.join(inputDir, 'source.png'),
    sourceJpegPath: path.join(inputDir, 'source.jpg'),
    musicXmlPath: path.join(outputDir, 'result.mxl'),
    omrPath: path.join(outputDir, 'result.omr'),
    logPath: path.join(outputDir, 'audiveris.log'),
  };
}

export async function cleanupJobWorkspace(
  workspace: Pick<JobWorkspace, 'rootPath'>,
): Promise<void> {
  await rm(workspace.rootPath, { recursive: true, force: true });
}

function resolveSafeJobId(jobId: string | undefined): string {
  // Job ids become directory names. If a caller passes a bad value, recover by
  // generating a safe id instead of failing the whole recognition request.
  if (jobId && SAFE_JOB_ID_PATTERN.test(jobId)) {
    return jobId;
  }

  return randomUUID();
}

function assertInsideTempRoot(tempRoot: string, targetPath: string): void {
  const relativePath = path.relative(tempRoot, targetPath);

  // Defense-in-depth for future call sites that may pass user-derived ids.
  if (
    relativePath === '' ||
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error('Job workspace path must stay inside the temp root');
  }
}
