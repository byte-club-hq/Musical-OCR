// This is the small public result the app can show. It is intentionally not a
// full MusicXML model; the backend stores/downloads MusicXML separately.
export type PitchItem = {
  readonly step: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';
  readonly octave: number;
};

export type RecognitionError = {
  readonly code: string;
  readonly message: string;
};

type RecognitionBase = {
  readonly jobId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

type PendingRecognitionResult = RecognitionBase & {
  readonly status: 'pending';
};

type ProcessingRecognitionResult = RecognitionBase & {
  readonly status: 'processing';
};

type CompletedRecognitionResult = RecognitionBase & {
  readonly status: 'completed';
  readonly pitches: readonly PitchItem[];
  readonly musicXmlReady: true;
};

type FailedRecognitionResult = RecognitionBase & {
  readonly status: 'failed';
  readonly error: RecognitionError;
  readonly musicXmlReady: false;
};

export type RecognitionResult =
  | PendingRecognitionResult
  | ProcessingRecognitionResult
  | CompletedRecognitionResult
  | FailedRecognitionResult;
