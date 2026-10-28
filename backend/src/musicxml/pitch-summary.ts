import type { PitchItem } from '@musical-ocr/shared';

// TODO: implement the pitch summary, e.g. C4 D4 E4 F4 for the
// simple-cdef-quarter fixture (see tests/fixtures/expected-results.json).
// Throwing is fine: the job still completes, just without pitches.
export function summarizePitches(_musicXml: string): PitchItem[] {
  return [];
}
