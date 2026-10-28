// HTTP contract shared by the backend and the app.
// Types only: both sides use `import type`, so nothing here exists at runtime.

export type PitchStep = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export type PitchItem = {
  readonly step: PitchStep;
  readonly octave: number;
};

export type RecognitionStatus =
  'pending' | 'processing' | 'completed' | 'failed';

export type RecognitionFailureCode =
  'recognition_failed' | 'recognition_timeout' | 'recognition_no_result';

export type ApiErrorCode =
  | 'invalid_upload'
  | 'recognition_busy'
  | 'recognition_unavailable'
  | 'recognition_not_found'
  | 'musicxml_not_ready'
  | 'musicxml_unavailable'
  | 'not_found'
  | 'internal_error';

export type ErrorBody<Code extends string = string> = {
  readonly code: Code;
  readonly message: string;
};

export type ApiErrorResponse = {
  readonly error: ErrorBody<ApiErrorCode>;
};

type RecognitionBase = {
  readonly jobId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type PendingRecognition = RecognitionBase & {
  readonly status: 'pending';
};

export type ProcessingRecognition = RecognitionBase & {
  readonly status: 'processing';
};

export type CompletedRecognition = RecognitionBase & {
  readonly status: 'completed';
  readonly pitches: readonly PitchItem[];
  readonly musicXmlReady: true;
};

export type FailedRecognition = RecognitionBase & {
  readonly status: 'failed';
  readonly error: ErrorBody<RecognitionFailureCode>;
  readonly musicXmlReady: false;
};

// 200 body of GET /api/recognitions/:id
export type RecognitionResult =
  | PendingRecognition
  | ProcessingRecognition
  | CompletedRecognition
  | FailedRecognition;

// 202 body of POST /api/recognitions
export type RecognitionAccepted = {
  readonly jobId: string;
  readonly status: 'pending';
};
