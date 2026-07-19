import { describe, expect, it } from 'vitest';

import type { RecognitionResult } from '../src/recognition/types.ts';
import {
  completedRecognition,
  failedRecognition,
  pendingRecognition,
  processingRecognition,
  recognitionExamples,
} from './fixtures/recognition-examples.ts';

describe('recognition examples', () => {
  it('documents every public job status shape', () => {
    const examples: readonly RecognitionResult[] = recognitionExamples;

    expect(examples.map((example) => example.status)).toEqual([
      'pending',
      'processing',
      'completed',
      'failed',
    ]);
  });

  it('shows the expected simple C4 D4 E4 F4 pitch summary', () => {
    expect(completedRecognition.pitches).toEqual([
      { step: 'C', octave: 4 },
      { step: 'D', octave: 4 },
      { step: 'E', octave: 4 },
      { step: 'F', octave: 4 },
    ]);
    expect(completedRecognition.musicXmlReady).toBe(true);
  });

  it('keeps failed results safe to expose', () => {
    expect(failedRecognition.error).toEqual({
      code: 'recognition_failed',
      message: 'The sheet music could not be recognized.',
    });
    expect(failedRecognition.musicXmlReady).toBe(false);
  });

  it('does not attach MusicXML state before completion', () => {
    expect('musicXmlReady' in pendingRecognition).toBe(false);
    expect('musicXmlReady' in processingRecognition).toBe(false);
  });
});
