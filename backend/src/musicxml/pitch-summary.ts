import type { PitchItem } from '@musical-ocr/shared';

// Turns MusicXML text into the small pitch list the app shows, for example
// C4 D4 E4 F4 for tests/fixtures/simple-cdef-quarter.png.
//
// TODO: implement the pitch summary. Keep this a pure function: XML text in, pitches
// out, no file or network access. The pipeline already calls it for every
// completed job, and a thrown error only means "no summary" (the MusicXML
// download still works), so it is safe to start with a narrow implementation.
// Expected pitches per fixture live in tests/fixtures/expected-results.json.
export function summarizePitches(musicXml: string): PitchItem[] {
  void musicXml; // remove once implemented
  return [];
}
