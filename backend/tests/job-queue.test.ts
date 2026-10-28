import { describe, expect, it, vi } from 'vitest';

import { createJobQueue } from '../src/recognition/job-queue.ts';

function deferredTask() {
  let finish = () => {};
  let fail = () => {};
  const task = vi.fn(
    () =>
      new Promise<void>((resolve, reject) => {
        finish = resolve;
        fail = () => reject(new Error('task failed'));
      }),
  );

  return { task, finish: () => finish(), fail: () => fail() };
}

describe('job queue', () => {
  it('never runs more tasks than the concurrency limit', async () => {
    const queue = createJobQueue(2);
    const [first, second, third] = [
      deferredTask(),
      deferredTask(),
      deferredTask(),
    ];

    queue.enqueue(first.task);
    queue.enqueue(second.task);
    queue.enqueue(third.task);

    expect(second.task).toHaveBeenCalled();
    expect(third.task).not.toHaveBeenCalled();
    expect(queue.waiting()).toBe(1);

    first.finish();
    await vi.waitFor(() => {
      expect(third.task).toHaveBeenCalled();
    });
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
});
