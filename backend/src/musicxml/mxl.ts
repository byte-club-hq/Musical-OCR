import { strFromU8, unzipSync } from 'fflate';

const CONTAINER_PATH = 'META-INF/container.xml';

// Audiveris exports compressed MusicXML (.mxl): a zip archive whose
// META-INF/container.xml names the score file inside it. This returns that
// score as XML text so parsers never deal with zip details.
export function extractMusicXml(mxl: Uint8Array): string {
  const files = unzipSync(mxl);
  const container = files[CONTAINER_PATH];
  const rootPath = container
    ? /<rootfile\b[^>]*\bfull-path="([^"]+)"/.exec(strFromU8(container))?.[1]
    : undefined;

  // Fall back to the first XML file outside META-INF for archives without a
  // usable container entry.
  const scorePath =
    rootPath ??
    Object.keys(files).find(
      (name) => name.endsWith('.xml') && !name.startsWith('META-INF/'),
    );
  const score = scorePath ? files[scorePath] : undefined;

  if (!score) {
    throw new Error('MXL archive does not contain a MusicXML score');
  }

  return strFromU8(score);
}
