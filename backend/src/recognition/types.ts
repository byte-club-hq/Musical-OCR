// The public shapes live in the shared contract package so the client app and
// the backend cannot drift apart. Re-exported here for backend modules.
import type { ErrorBody, RecognitionFailureCode } from '@musical-ocr/shared';

export type { PitchItem, RecognitionResult } from '@musical-ocr/shared';

export type RecognitionError = ErrorBody<RecognitionFailureCode>;
