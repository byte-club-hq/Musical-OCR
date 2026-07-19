import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  cleanupJobWorkspace,
  createJobWorkspace,
} from '../src/workspaces/job-workspace.ts';

let tempRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'musical-ocr-test-'));
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('job workspace', () => {
  it('creates input and output directories under the configured temp root', async () => {
    const workspace = await createJobWorkspace({
      jobId: 'job-test-1',
      tempRoot,
    });

    await expectPathToExist(workspace.rootPath);
    await expectPathToExist(workspace.inputDir);
    await expectPathToExist(workspace.outputDir);

    expect(workspace.rootPath).toBe(path.join(tempRoot, 'job-test-1'));
    expect(workspace.inputDir).toBe(path.join(workspace.rootPath, 'input'));
    expect(workspace.outputDir).toBe(path.join(workspace.rootPath, 'output'));
  });

  it('exposes predictable Audiveris input and output paths', async () => {
    const workspace = await createJobWorkspace({
      jobId: 'job-test-2',
      tempRoot,
    });

    expect(workspace).toMatchObject({
      sourcePngPath: path.join(workspace.inputDir, 'source.png'),
      sourceJpegPath: path.join(workspace.inputDir, 'source.jpg'),
      musicXmlPath: path.join(workspace.outputDir, 'result.mxl'),
      omrPath: path.join(workspace.outputDir, 'result.omr'),
      logPath: path.join(workspace.outputDir, 'audiveris.log'),
    });
  });

  it('creates a unique workspace when no job id is provided', async () => {
    const firstWorkspace = await createJobWorkspace({ tempRoot });
    const secondWorkspace = await createJobWorkspace({ tempRoot });

    expect(firstWorkspace.jobId).not.toBe(secondWorkspace.jobId);
    expect(firstWorkspace.rootPath).not.toBe(secondWorkspace.rootPath);
  });

  it('removes the whole job workspace during cleanup', async () => {
    const workspace = await createJobWorkspace({
      jobId: 'job-test-3',
      tempRoot,
    });
    await writeFile(workspace.musicXmlPath, '<score-partwise />');

    await cleanupJobWorkspace(workspace);

    await expectPathToBeMissing(workspace.rootPath);
  });

  it.each(['../outside', 'nested/job', 'job name', ''])(
    'falls back to a generated safe job id for unsafe value %j',
    async (jobId) => {
      const workspace = await createJobWorkspace({ jobId, tempRoot });

      expect(workspace.jobId).not.toBe(jobId);
      expect(workspace.jobId).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(workspace.rootPath).toBe(path.join(tempRoot, workspace.jobId));
      await expectPathToExist(workspace.rootPath);
    },
  );
});

async function expectPathToExist(targetPath: string): Promise<void> {
  await expect(access(targetPath)).resolves.toBeUndefined();
}

async function expectPathToBeMissing(targetPath: string): Promise<void> {
  await expect(access(targetPath)).rejects.toThrow();
}
