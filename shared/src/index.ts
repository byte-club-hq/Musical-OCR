// The HTTP contract between the client app and the backend.
//
// This package holds TYPES ONLY. Both workspaces import it with `import type`,
// which TypeScript erases, so neither Metro nor Node ever loads it at runtime.
// Do not add runtime values (constants, functions) here.
//
// See ARCHITECTURE.md for the endpoints that use these shapes.

export type PitchStep = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

// One recognized note in the small result summary. This is intentionally not a
// full MusicXML model; the full score is downloaded as MusicXML separately.
export type PitchItem = {
  readonly step: PitchStep;
  readonly octave: number;
};

export type RecognitionStatus =
  'pending' | 'processing' | 'completed' | 'failed';

// Codes a finished job can fail with. Shown to users through `message`.
export type RecognitionFailureCode =
  'recognition_failed' | 'recognition_timeout' | 'recognition_no_result';

// Codes returned in error responses (non-2xx) by the HTTP API.
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

// Body of every non-2xx JSON response.
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
