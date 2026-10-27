import { describe, expect, it, vi } from 'vitest';

import { createJobQueue } from '../src/recognition/job-queue.ts';

function deferredTask() {
  let finish: () => void = () => undefined;
  let fail: () => void = () => undefined;
  const task = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = () => {
          reject(new Error('task failed'));
        };
      }),
  );

  return { task, finish: () => finish(), fail: () => fail() };
}

describe('job queue', () => {
  it('never runs more tasks than the concurrency limit', async () => {
    const queue = createJobQueue(2);
    const tasks = [deferredTask(), deferredTask(), deferredTask()];

    tasks.forEach(({ task }) => {
      queue.enqueue(task);
    });

    expect(queue.running()).toBe(2);
    expect(queue.waiting()).toBe(1);
    expect(tasks[2]?.task).not.toHaveBeenCalled();

    tasks[0]?.finish();
    await vi.waitFor(() => {
      expect(tasks[2]?.task).toHaveBeenCalled();
    });
    expect(queue.running()).toBe(2);
    expect(queue.waiting()).toBe(0);
  });

  it('frees a slot when a task rejects', async () => {
    const queue = createJobQueue(1);
    const first = deferredTask();
    const second = deferredTask();

    queue.enqueue(first.task);
    queue.enqueue(second.task);
    first.fail();

    await vi.waitFor(() => {
      expect(second.task).toHaveBeenCalled();
    });
  });

  it('rejects invalid concurrency limits', () => {
    expect(() => createJobQueue(0)).toThrow();
    expect(() => createJobQueue(1.5)).toThrow();
  });
});
