import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';

import { extractMusicXml } from '../src/musicxml/mxl.ts';

const score = '<?xml version="1.0"?><score-partwise version="4.0"/>';

describe('extractMusicXml', () => {
  it('reads the score named by META-INF/container.xml', () => {
    const mxl = zipSync({
      'META-INF/container.xml': strToU8(
        '<container><rootfiles><rootfile full-path="scores/source.xml" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>',
      ),
      'scores/source.xml': strToU8(score),
      'other.xml': strToU8('<not-the-score/>'),
    });

    expect(extractMusicXml(mxl)).toBe(score);
  });

  it('rejects archives without a container entry', () => {
    const mxl = zipSync({ 'source.xml': strToU8(score) });

    expect(() => extractMusicXml(mxl)).toThrow();
  });

  it('rejects bytes that are not a zip archive', () => {
    expect(() => extractMusicXml(strToU8('not a zip'))).toThrow();
  });
});
