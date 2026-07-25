import { randomUUID } from 'node:crypto';

import type { RequestHandler } from 'express';
import multer from 'multer';

import { MAX_IMAGE_BYTES, validateUploadedImage } from './image-upload.ts';

const upload = multer({
  // Keep the image in memory for this validation-only endpoint.
  // we copy accepted bytes into a per-job workspace.
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

export const acceptRecognitionUpload: RequestHandler = (request, response) => {
  // Multer parses multipart/form-data and puts the single accepted file on
  // request.file. The field name must match the frontend contract: image.
  upload(request, response, (error: unknown) => {
    if (error) {
      response.status(400).json(invalidUploadBody);
      return;
    }

    const image = request.file
      ? validateUploadedImage(request.file.buffer)
      : null;

    // Multer only proves that a file field arrived. This second check proves
    // the bytes decode as a supported image within the MVP limits.
    if (!image) {
      response.status(400).json(invalidUploadBody);
      return;
    }

    // For now the endpoint only confirms that the upload crossed the validation boundary.
    response.status(202).json({
      jobId: randomUUID(),
      status: 'pending',
    });
  });
};
