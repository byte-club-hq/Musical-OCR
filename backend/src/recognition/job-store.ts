import type {
  PitchItem,
  RecognitionError,
  RecognitionResult,
} from './types.ts';

// Finished jobs stay readable long enough for the client to poll and download
// the result, then are dropped so a long-running process does not keep every
// MusicXML file in memory forever. Pending and processing jobs never expire.
export const DEFAULT_RETENTION_MS = 60 * 60 * 1000;

type StoredJob = {
  readonly result: RecognitionResult;
  readonly musicXml?: Buffer;
  readonly finishedAt?: number;
};

export type RecognitionJobStore = {
  readonly create: (jobId: string) => RecognitionResult;
  readonly get: (jobId: string) => RecognitionResult | undefined;
  readonly getMusicXml: (jobId: string) => Buffer | undefined;
  readonly markProcessing: (jobId: string) => void;
  readonly markCompleted: (
    jobId: string,
    musicXml: Buffer,
    pitches: readonly PitchItem[],
  ) => void;
  readonly markFailed: (jobId: string, error: RecognitionError) => void;
};

export function createJobStore(
  options: {
    readonly retentionMs?: number;
    readonly now?: () => number;
  } = {},
): RecognitionJobStore {
  const retentionMs = options.retentionMs ?? DEFAULT_RETENTION_MS;
  const now = options.now ?? Date.now;
  const jobs = new Map<string, StoredJob>();

  const removeExpiredJobs = () => {
    const cutoff = now() - retentionMs;

    for (const [jobId, job] of jobs) {
      if (job.finishedAt !== undefined && job.finishedAt <= cutoff) {
        jobs.delete(jobId);
      }
    }
  };

  const read = (jobId: string) => {
    removeExpiredJobs();

    return jobs.get(jobId);
  };

  const timestamp = () => new Date(now()).toISOString();

  return {
    create: (jobId) => {
      removeExpiredJobs();

      if (jobs.has(jobId)) {
        throw new Error('Recognition job ids must be unique');
      }

      const createdAt = timestamp();
      const result: RecognitionResult = {
        jobId,
        status: 'pending',
        createdAt,
        updatedAt: createdAt,
      };
      jobs.set(jobId, { result });

      return result;
    },
    get: (jobId) => read(jobId)?.result,
    getMusicXml: (jobId) => read(jobId)?.musicXml,
    markProcessing: (jobId) => {
      const job = read(jobId);

      if (job?.result.status !== 'pending') {
        return;
      }

      jobs.set(jobId, {
        result: {
          jobId,
          status: 'processing',
          createdAt: job.result.createdAt,
          updatedAt: timestamp(),
        },
      });
    },
    markCompleted: (jobId, musicXml, pitches) => {
      const job = read(jobId);

      if (!job) {
        return;
      }

      jobs.set(jobId, {
        result: {
          jobId,
          status: 'completed',
          createdAt: job.result.createdAt,
          updatedAt: timestamp(),
          pitches,
          musicXmlReady: true,
        },
        musicXml,
        finishedAt: now(),
      });
    },
    markFailed: (jobId, error) => {
      const job = read(jobId);

      if (!job) {
        return;
      }

      jobs.set(jobId, {
        result: {
          jobId,
          status: 'failed',
          createdAt: job.result.createdAt,
          updatedAt: timestamp(),
          error,
          musicXmlReady: false,
        },
        finishedAt: now(),
      });
    },
  };
}
