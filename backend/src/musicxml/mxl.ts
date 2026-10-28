import { strFromU8, unzipSync } from 'fflate';

// A .mxl file is a zip archive; META-INF/container.xml names the score inside.
export function extractMusicXml(mxl: Uint8Array): string {
  const files = unzipSync(mxl);
  const container = files['META-INF/container.xml'];
  const scorePath = container
    ? /full-path="([^"]+)"/.exec(strFromU8(container))?.[1]
    : undefined;
  const score = scorePath ? files[scorePath] : undefined;

  if (!score) {
    throw new Error('MXL archive does not contain a MusicXML score');
  }

  return strFromU8(score);
}
