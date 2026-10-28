import { describe, expect, it } from 'vitest';

import { createJobStore } from '../src/recognition/job-store.ts';

const failure = {
  code: 'recognition_failed',
  message: 'Could not process.',
} as const;

describe('recognition job store', () => {
  it('moves a job from pending through processing to completed', () => {
    const store = createJobStore();
    const musicXml = Buffer.from('mxl');

    expect(store.create('job-a')).toMatchObject({ status: 'pending' });

    store.markProcessing('job-a');
    expect(store.get('job-a')).toMatchObject({ status: 'processing' });
    expect(store.getMusicXml('job-a')).toBeUndefined();

    store.markCompleted('job-a', musicXml, [{ step: 'C', octave: 4 }]);
    expect(store.get('job-a')).toMatchObject({
      status: 'completed',
      pitches: [{ step: 'C', octave: 4 }],
      musicXmlReady: true,
    });
    expect(store.getMusicXml('job-a')).toBe(musicXml);
  });

  it('keeps several jobs independent', () => {
    const store = createJobStore();

    store.create('job-a');
    store.create('job-b');
    store.create('job-c');
    store.markProcessing('job-b');
    store.markFailed('job-c', failure);

    expect(store.get('job-a')?.status).toBe('pending');
    expect(store.get('job-b')?.status).toBe('processing');
    expect(store.get('job-c')).toMatchObject({
      status: 'failed',
      error: failure,
      musicXmlReady: false,
    });
  });

  it('rejects duplicate job ids', () => {
    const store = createJobStore();

    store.create('job-a');

    expect(() => store.create('job-a')).toThrow();
  });

  it('drops finished jobs after the retention period', () => {
    let now = 0;
    const store = createJobStore({ retentionMs: 1000, now: () => now });

    store.create('completed');
    store.create('failed');
    store.create('still-pending');
    store.markCompleted('completed', Buffer.from('mxl'), []);
    store.markFailed('failed', failure);

    now = 999;
    expect(store.get('completed')).toBeDefined();
    expect(store.get('failed')).toBeDefined();

    now = 1000;
    expect(store.get('completed')).toBeUndefined();
    expect(store.getMusicXml('completed')).toBeUndefined();
    expect(store.get('failed')).toBeUndefined();
    expect(store.get('still-pending')?.status).toBe('pending');
  });
});
