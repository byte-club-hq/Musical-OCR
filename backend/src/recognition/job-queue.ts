// Each Audiveris run starts its own JVM inside a Docker container and can use
// more than 1 GB of memory, so only a few runs may happen at once. Extra jobs
// wait in FIFO order and keep their pending status until a slot frees up.
export const DEFAULT_CONCURRENCY = 2;

type Task = () => Promise<void>;

export type JobQueue = {
  readonly enqueue: (task: Task) => void;
  readonly running: () => number;
  readonly waiting: () => number;
};

export function createJobQueue(concurrency = DEFAULT_CONCURRENCY): JobQueue {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new Error('Job queue concurrency must be a positive integer');
  }

  const waitingTasks: Task[] = [];
  let runningCount = 0;

  const startNext = () => {
    while (runningCount < concurrency) {
      const task = waitingTasks.shift();

      if (!task) {
        return;
      }

      runningCount += 1;
      // Tasks own their error handling; a rejected task must still free its
      // slot so one broken job cannot stall the queue.
      void task()
        .catch(() => undefined)
        .finally(() => {
          runningCount -= 1;
          startNext();
        });
    }
  };

  return {
    enqueue: (task) => {
      waitingTasks.push(task);
      startNext();
    },
    running: () => runningCount,
    waiting: () => waitingTasks.length,
  };
}
