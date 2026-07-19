import { spawn } from 'node:child_process';
import { rename, stat } from 'node:fs/promises';
import path from 'node:path';

import type { JobWorkspace } from '../workspaces/types.ts';
import type { AudiverisRunResult } from './types.ts';

type AudiverisFailure = Extract<AudiverisRunResult, { readonly ok: false }>;
type AudiverisFailureReason = AudiverisFailure['reason'];
type AudiverisDockerCommand = {
  readonly command: 'docker';
  readonly args: readonly string[];
};
type AudiverisCommandResult = {
  readonly exitCode: number | null;
  readonly signal: NodeJS.Signals | null;
  readonly timedOut: boolean;
  readonly stdout: string;
  readonly stderr: string;
};
type AudiverisCommandExecutor = (
  command: string,
  args: readonly string[],
  timeoutMs: number,
) => Promise<AudiverisCommandResult>;
type RunAudiverisOptions = {
  readonly dockerImage?: string;
  readonly timeoutMs?: number;
  readonly executeCommand?: AudiverisCommandExecutor;
};

const DEFAULT_AUDIVERIS_IMAGE = 'drawliin/musical-ocr-audiveris:5.11.0';
const DEFAULT_TIMEOUT_MS = 120_000;

export async function runAudiveris(
  workspace: JobWorkspace,
  inputImagePath: string,
  options: RunAudiverisOptions = {},
): Promise<AudiverisRunResult> {
  assertSupportedWorkspaceInput(workspace, inputImagePath);

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const command = buildAudiverisDockerCommand(workspace, inputImagePath, {
    dockerImage: options.dockerImage ?? DEFAULT_AUDIVERIS_IMAGE,
  });
  const executeCommand = options.executeCommand ?? executeProcess;
  const processResult = await executeCommand(
    command.command,
    command.args,
    timeoutMs,
  );

  if (processResult.timedOut) {
    return failure('timeout', 'Audiveris timed out', processResult);
  }

  if (processResult.exitCode !== 0) {
    return failure(
      'process-failed',
      'Audiveris exited with a non-zero status',
      processResult,
    );
  }

  const musicXmlPath = await normalizeMusicXmlOutput(workspace, inputImagePath);

  if (!musicXmlPath) {
    return failure(
      'missing-output',
      'Audiveris did not produce MusicXML output',
      processResult,
    );
  }

  return {
    ok: true,
    musicXmlPath,
  };
}

function buildAudiverisDockerCommand(
  workspace: JobWorkspace,
  inputImagePath: string,
  options: { readonly dockerImage?: string } = {},
): AudiverisDockerCommand {
  assertSupportedWorkspaceInput(workspace, inputImagePath);

  // Keep container paths stable; only the host-side workspace changes per job.
  const containerInputPath = `/input/${path.basename(inputImagePath)}`;
  const shellCommand = [
    "xvfb-run --auto-servernum --server-args='-screen 0 1920x1080x24'",
    '/opt/audiveris/bin/Audiveris',
    '-batch',
    '-transcribe',
    '-export',
    '-output /output',
    containerInputPath,
  ].join(' ');

  return {
    command: 'docker',
    args: [
      'run',
      '--rm',
      '--entrypoint',
      'sh',
      '-v',
      `${workspace.inputDir}:/input:ro`,
      '-v',
      `${workspace.outputDir}:/output`,
      options.dockerImage ?? DEFAULT_AUDIVERIS_IMAGE,
      '-lc',
      shellCommand,
    ],
  };
}

async function executeProcess(
  command: string,
  args: readonly string[],
  timeoutMs: number,
): Promise<AudiverisCommandResult> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Node's spawn has no built-in timeout, so kill the child and report it
    // as a typed adapter failure instead of leaving a stuck recognition job.
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({
        exitCode,
        signal,
        timedOut,
        stdout,
        stderr,
      });
    });
  });
}

async function normalizeMusicXmlOutput(
  workspace: JobWorkspace,
  inputImagePath: string,
): Promise<string | undefined> {
  if (await isNonEmptyFile(workspace.musicXmlPath)) {
    return workspace.musicXmlPath;
  }

  const rawMusicXmlPath = path.join(
    workspace.outputDir,
    `${path.parse(inputImagePath).name}.mxl`,
  );

  if (!(await isNonEmptyFile(rawMusicXmlPath))) {
    return undefined;
  }

  // Audiveris names exported files after the input basename. The rest of the
  // backend uses one canonical result path so later endpoints do not need to
  // know Audiveris naming rules.
  if (rawMusicXmlPath !== workspace.musicXmlPath) {
    await rename(rawMusicXmlPath, workspace.musicXmlPath);
  }

  return workspace.musicXmlPath;
}

async function isNonEmptyFile(filePath: string): Promise<boolean> {
  try {
    const fileStat = await stat(filePath);

    return fileStat.isFile() && fileStat.size > 0;
  } catch {
    return false;
  }
}

function assertSupportedWorkspaceInput(
  workspace: JobWorkspace,
  inputImagePath: string,
): void {
  // The upload step must copy exactly one validated image into the workspace.
  // Reject arbitrary paths here so Docker never receives a broader host mount.
  const resolvedInput = path.resolve(inputImagePath);
  const supportedInputs = [
    path.resolve(workspace.sourcePngPath),
    path.resolve(workspace.sourceJpegPath),
  ];

  if (!supportedInputs.includes(resolvedInput)) {
    throw new Error('Audiveris input must be the workspace source image path');
  }
}

function failure(
  reason: AudiverisFailureReason,
  message: string,
  result: AudiverisCommandResult,
): AudiverisFailure {
  return {
    ok: false,
    reason,
    message,
    exitCode: result.exitCode,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}
