import { decode as decodeJpeg } from 'jpeg-js';
import { PNG } from 'pngjs';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 6000;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

type AcceptedImage = {
  readonly mediaType: 'image/png' | 'image/jpeg';
  readonly width: number;
  readonly height: number;
};

export function validateUploadedImage(buffer: Buffer): AcceptedImage | null {
  if (buffer.length > MAX_IMAGE_BYTES) {
    return null;
  }

  // Do not trust filename extensions or client-provided MIME types. Decode the
  // actueal bytes so renamed text fils and corrupt images are rejected.
  const image = decodePng(buffer) ?? decodeJpegImage(buffer);

  if (!image) {
    return null;
  }

  if (
    image.width < 1 ||
    image.height < 1 ||
    image.width > MAX_IMAGE_DIMENSION ||
    image.height > MAX_IMAGE_DIMENSION
  ) {
    return null;
  }

  return image;
}

function decodePng(buffer: Buffer): AcceptedImage | null {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return null;
  }

  try {
    // CRC checking catches PNGs whose headers look valid but whose chunks were
    // damaged or tampered with.
    const png = PNG.sync.read(buffer, { checkCRC: true });

    return {
      mediaType: 'image/png',
      width: png.width,
      height: png.height,
    };
  } catch {
    return null;
  }
}

function decodeJpegImage(buffer: Buffer): AcceptedImage | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  try {
    // Keep decoder limits aligned with the public 6000 x 6000 image ceiling.
    const jpeg = decodeJpeg(buffer, {
      maxMemoryUsageInMB: 256,
      maxResolutionInMP: 36,
      tolerantDecoding: false,
      useTArray: true,
    });

    return {
      mediaType: 'image/jpeg',
      width: jpeg.width,
      height: jpeg.height,
    };
  } catch {
    return null;
  }
}
