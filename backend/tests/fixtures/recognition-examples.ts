import type { RecognitionResult } from '../../src/recognition/types.ts';

const createdAt = '2026-07-19T00:00:00.000Z';
const updatedAt = '2026-07-19T00:00:01.000Z';

export const pendingRecognition = {
  jobId: 'job-pending',
  status: 'pending',
  createdAt,
  updatedAt: createdAt,
} satisfies RecognitionResult;

export const processingRecognition = {
  jobId: 'job-processing',
  status: 'processing',
  createdAt,
  updatedAt,
} satisfies RecognitionResult;

export const completedRecognition = {
  jobId: 'job-completed',
  status: 'completed',
  createdAt,
  updatedAt,
  pitches: [
    { step: 'C', octave: 4 },
    { step: 'D', octave: 4 },
    { step: 'E', octave: 4 },
    { step: 'F', octave: 4 },
  ],
  musicXmlReady: true,
} satisfies RecognitionResult;

export const failedRecognition = {
  jobId: 'job-failed',
  status: 'failed',
  createdAt,
  updatedAt,
  error: {
    code: 'recognition_failed',
    message: 'The sheet music could not be recognized.',
  },
  musicXmlReady: false,
} satisfies RecognitionResult;

export const recognitionExamples = [
  pendingRecognition,
  processingRecognition,
  completedRecognition,
  failedRecognition,
] as const;
