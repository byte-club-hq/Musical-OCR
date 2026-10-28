import type {
  ApiErrorResponse,
  RecognitionAccepted,
  RecognitionResult,
} from '@musical-ocr/shared';

import { apiBaseUrl } from '../../config/api';

import type { SelectedImage } from './types';

// TODO: validate response bodies at runtime instead of these light checks.

const genericUploadError = 'Could not upload this image. Please try again.';
const genericStatusError = 'Could not check recognition status.';

export async function uploadRecognitionImage(
  image: SelectedImage,
): Promise<RecognitionAccepted> {
  const response = await fetch(`${apiBaseUrl}/api/recognitions`, {
    body: createRecognitionUploadBody(image),
    method: 'POST',
  });

  const body = (await response.json().catch(() => null)) as
    RecognitionAccepted | ApiErrorResponse | null;

  if (
    response.ok &&
    body &&
    'jobId' in body &&
    typeof body.jobId === 'string' &&
    body.status === 'pending'
  ) {
    return body;
  }

  throw new Error(errorMessage(body, genericUploadError));
}

export async function fetchRecognitionStatus(
  jobId: string,
): Promise<RecognitionResult> {
  const response = await fetch(
    `${apiBaseUrl}/api/recognitions/${encodeURIComponent(jobId)}`,
  );
  const body = (await response.json().catch(() => null)) as
    RecognitionResult | ApiErrorResponse | null;

  if (
    response.ok &&
    body &&
    'jobId' in body &&
    body.jobId === jobId &&
    (body.status === 'pending' ||
      body.status === 'processing' ||
      body.status === 'completed' ||
      body.status === 'failed')
  ) {
    return body;
  }

  throw new Error(errorMessage(body, genericStatusError));
}

export function musicXmlDownloadUrl(jobId: string): string {
  return `${apiBaseUrl}/api/recognitions/${encodeURIComponent(jobId)}/musicxml`;
}

// Backend error messages are written for users, so show them when present.
function errorMessage(body: object | null, fallback: string): string {
  return body && 'error' in body
    ? (body as ApiErrorResponse).error.message
    : fallback;
}

function createRecognitionUploadBody(image: SelectedImage): FormData {
  const formData = new FormData();
  const uploadPart =
    image.file ??
    ({
      name: image.name ?? 'sheet-music.jpg',
      type: image.mimeType ?? 'image/jpeg',
      uri: image.uri,
    } as unknown as Blob);

  formData.append('image', uploadPart);

  return formData;
}
