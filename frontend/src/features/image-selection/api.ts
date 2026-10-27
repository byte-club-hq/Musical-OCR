import { apiBaseUrl } from '../../config/api';

import type { RecognitionJobStatus, SelectedImage } from './types';

const genericUploadError = 'Could not upload this image. Please try again.';
const genericStatusError = 'Could not check recognition status.';

type RecognitionAcceptedResponse = {
  readonly jobId: string;
  readonly status: 'pending';
};

type RecognitionErrorResponse = {
  readonly error?: {
    readonly message?: string;
  };
};

export async function uploadRecognitionImage(
  image: SelectedImage,
): Promise<RecognitionAcceptedResponse> {
  const response = await fetch(`${apiBaseUrl}/api/recognitions`, {
    body: createRecognitionUploadBody(image),
    method: 'POST',
  });

  const body = (await response.json().catch(() => null)) as
    RecognitionAcceptedResponse | RecognitionErrorResponse | null;

  if (
    response.ok &&
    body &&
    'jobId' in body &&
    typeof body.jobId === 'string' &&
    body.status === 'pending'
  ) {
    return body;
  }

  const safeMessage =
    body && 'error' in body && typeof body.error?.message === 'string'
      ? body.error.message
      : genericUploadError;

  throw new Error(safeMessage);
}

export async function fetchRecognitionStatus(
  jobId: string,
): Promise<RecognitionJobStatus> {
  const response = await fetch(`${apiBaseUrl}/api/recognitions/${jobId}`);
  const body = (await response.json().catch(() => null)) as
    RecognitionJobStatus | RecognitionErrorResponse | null;

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

  const safeMessage =
    body && 'error' in body && typeof body.error?.message === 'string'
      ? body.error.message
      : genericStatusError;

  throw new Error(safeMessage);
}

export function musicXmlDownloadUrl(jobId: string): string {
  return `${apiBaseUrl}/api/recognitions/${encodeURIComponent(jobId)}/musicxml`;
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
