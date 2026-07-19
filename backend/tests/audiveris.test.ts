import { access, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { runAudiveris } from '../src/audiveris/adapter.ts';
import { createJobWorkspace } from '../src/workspaces/job-workspace.ts';

let tempRoot: string;
let workspace: Awaited<ReturnType<typeof createJobWorkspace>>;

beforeEach(async () => {
  tempRoot = await mkdtemp(path.join(tmpdir(), 'musical-ocr-audiveris-test-'));
  workspace = await createJobWorkspace({ jobId: 'job-audiveris', tempRoot });
  await writeFile(workspace.sourcePngPath, 'fake image bytes');
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe('runAudiveris', () => {
  it('runs the Dockerized Audiveris batch command for the workspace', async () => {
    let capturedCommand:
      | {
          readonly command: string;
          readonly args: readonly string[];
          readonly timeoutMs: number;
        }
      | undefined;

    await runAudiveris(workspace, workspace.sourcePngPath, {
      executeCommand: async (command, args, timeoutMs) => {
        capturedCommand = { command, args, timeoutMs };

        return successfulCommand();
      },
    });

    expect(capturedCommand).toBeDefined();
    const command = capturedCommand;

    if (!command) {
      throw new Error('Expected Audiveris command to be captured');
    }

    expect(command.command).toBe('docker');
    expect(command.args).toContain('drawliin/musical-ocr-audiveris:5.11.0');
    expect(command.args).toContain(`${workspace.inputDir}:/input:ro`);
    expect(command.args).toContain(`${workspace.outputDir}:/output`);
    expect(command.args.at(-1)).toContain('/input/source.png');
    expect(command.args.at(-1)).toContain('-output /output');
    expect(command.timeoutMs).toBe(120_000);
  });

  it('returns the canonical MusicXML path when Audiveris succeeds', async () => {
    const result = await runAudiveris(workspace, workspace.sourcePngPath, {
      executeCommand: async () => {
        await writeFile(
          path.join(workspace.outputDir, 'source.mxl'),
          '<score-partwise />',
        );
        return successfulCommand();
      },
    });

    expect(result).toEqual({
      ok: true,
      musicXmlPath: workspace.musicXmlPath,
    });
    await expect(access(workspace.musicXmlPath)).resolves.toBeUndefined();
    await expect(
      access(path.join(workspace.outputDir, 'source.mxl')),
    ).rejects.toThrow();
  });

  it('returns a timeout failure when the process exceeds the timeout', async () => {
    const result = await runAudiveris(workspace, workspace.sourcePngPath, {
      executeCommand: async () => ({
        ...successfulCommand(),
        timedOut: true,
        signal: 'SIGTERM',
      }),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'timeout',
      message: 'Audiveris timed out',
      signal: 'SIGTERM',
    });
  });

  it('returns a process failure when Docker exits non-zero', async () => {
    const result = await runAudiveris(workspace, workspace.sourcePngPath, {
      executeCommand: async () => ({
        ...successfulCommand(),
        exitCode: 1,
        stderr: 'docker failed',
      }),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'process-failed',
      exitCode: 1,
      stderr: 'docker failed',
    });
  });

  it('returns a missing-output failure when no MusicXML file is produced', async () => {
    const result = await runAudiveris(workspace, workspace.sourcePngPath, {
      executeCommand: async () => successfulCommand(),
    });

    expect(result).toMatchObject({
      ok: false,
      reason: 'missing-output',
      message: 'Audiveris did not produce MusicXML output',
    });
  });

  it('rejects input paths outside the workspace contract', async () => {
    await expect(
      runAudiveris(workspace, path.join(workspace.inputDir, 'other.png'), {
        executeCommand: async () => successfulCommand(),
      }),
    ).rejects.toThrow(
      'Audiveris input must be the workspace source image path',
    );
  });
});

function successfulCommand() {
  return {
    exitCode: 0,
    signal: null,
    timedOut: false,
    stdout: '',
    stderr: '',
  };
}
