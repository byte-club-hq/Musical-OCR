import type {
  PitchItem,
  RecognitionError,
  RecognitionResult,
} from './types.ts';

type StoredJob = {
  readonly result: RecognitionResult;
  readonly musicXml?: Buffer;
  readonly finishedAt?: number;
};

export type RecognitionJobStore = ReturnType<typeof createJobStore>;

// In-memory jobs. Finished jobs (and their MusicXML) are dropped after
// `retentionMs` so memory does not grow forever; unfinished jobs never expire.
export function createJobStore(retentionMs: number, now = Date.now) {
  const jobs = new Map<string, StoredJob>();

  const read = (jobId: string) => {
    const cutoff = now() - retentionMs;

    for (const [id, job] of jobs) {
      if (job.finishedAt !== undefined && job.finishedAt <= cutoff) {
        jobs.delete(id);
      }
    }

    return jobs.get(jobId);
  };

  const timestamp = () => new Date(now()).toISOString();

  return {
    create: (jobId: string) => {
      const createdAt = timestamp();
      jobs.set(jobId, {
        result: { jobId, status: 'pending', createdAt, updatedAt: createdAt },
      });
    },

    get: (jobId: string) => read(jobId)?.result,

    getMusicXml: (jobId: string) => read(jobId)?.musicXml,

    markProcessing: (jobId: string) => {
      const job = read(jobId);

      if (job) {
        jobs.set(jobId, {
          result: {
            jobId,
            status: 'processing',
            createdAt: job.result.createdAt,
            updatedAt: timestamp(),
          },
        });
      }
    },

    markCompleted: (
      jobId: string,
      musicXml: Buffer,
      pitches: readonly PitchItem[],
    ) => {
      const job = read(jobId);

      if (job) {
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
      }
    },

    markFailed: (jobId: string, error: RecognitionError) => {
      const job = read(jobId);

      if (job) {
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
      }
    },
  };
}
