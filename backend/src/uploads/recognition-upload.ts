import type { RequestHandler } from 'express';
import multer from 'multer';

import {
  startRecognitionJob,
  type StartRecognitionJobOptions,
} from '../recognition/jobs.ts';
import { MAX_IMAGE_BYTES, validateUploadedImage } from './image-upload.ts';

type RecognitionJobStarter = (
  options: StartRecognitionJobOptions,
) => Promise<{ readonly jobId: string; readonly status: 'pending' }>;

const upload = multer({
  // Keep the image in memory for this validation-only endpoint.
  // We copy accepted bytes into a per-job workspace.
  storage: multer.memoryStorage(),
  limits: {
    fields: 0,
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
}).single('image');

// Use one generic public error so rejected uploads never leak filenames, local
// paths, parser details, stack traces, or image bytes.
const invalidUploadBody = {
  error: {
    code: 'invalid_upload',
    message: 'Upload must be one PNG or JPEG image up to 10 MB.',
  },
} as const;

const unavailableBody = {
  error: {
    code: 'recognition_unavailable',
    message: 'Could not start recognition for this image.',
  },
} as const;

export function createRecognitionUploadHandler(
  startJob: RecognitionJobStarter = startRecognitionJob,
): RequestHandler {
  return (request, response) => {
    // Multer parses multipart/form-data and puts the single accepted file on
    // request.file. The field name must match the frontend contract: image.
    upload(request, response, (error: unknown) => {
      void (async () => {
        if (error) {
          response.status(400).json(invalidUploadBody);
          return;
        }

        const image = request.file
          ? validateUploadedImage(request.file.buffer)
          : null;

        // Multer only proves that a file field arrived. This second check proves
        // the bytes decode as a supported image within the MVP limits.
        if (!image || !request.file) {
          response.status(400).json(invalidUploadBody);
          return;
        }

        const job = await startJob({
          imageBuffer: request.file.buffer,
          mediaType: image.mediaType,
        });

        response.status(202).json({
          jobId: job.jobId,
          status: job.status,
        });
      })().catch(() => {
        response.status(500).json(unavailableBody);
      });
    });
  };
}

export const acceptRecognitionUpload = createRecognitionUploadHandler();
