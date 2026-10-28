type Task = () => Promise<void>;

export type JobQueue = {
  readonly enqueue: (task: Task) => void;
  readonly waiting: () => number;
};

// Runs at most `concurrency` tasks at once, the rest wait in FIFO order.
// Each Audiveris run is a JVM in Docker using 1-2 GB, hence the limit.
export function createJobQueue(concurrency: number): JobQueue {
  const waitingTasks: Task[] = [];
  let running = 0;

  const startNext = () => {
    while (running < concurrency && waitingTasks.length > 0) {
      const task = waitingTasks.shift() as Task;
      running += 1;
      // A failing task must still free its slot.
      void task()
        .catch(() => undefined)
        .finally(() => {
          running -= 1;
          startNext();
        });
    }
  };

  return {
    enqueue: (task) => {
      waitingTasks.push(task);
      startNext();
    },
    waiting: () => waitingTasks.length,
  };
}
