export type AudiverisRunResult =
  | {
      readonly ok: true;
      readonly musicXmlPath: string;
    }
  | {
      readonly ok: false;
      readonly reason: 'timeout' | 'process-failed' | 'missing-output';
      readonly message: string;
      readonly exitCode: number | null;
      readonly signal: NodeJS.Signals | null;
      readonly stdout: string;
      readonly stderr: string;
    };
