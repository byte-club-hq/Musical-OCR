import type { RecognitionAccepted } from '@musical-ocr/shared';
import type { RequestHandler } from 'express';
import multer from 'multer';

import { sendError } from '../http/errors.ts';
import {
  RecognitionBusyError,
  type RecognitionService,
} from '../recognition/service.ts';
import { MAX_IMAGE_BYTES, validateUploadedImage } from './image-upload.ts';

const upload = multer({
  // Keep the image in memory; the recognition service copies accepted bytes
  // into a per-job workspace.
  storage: multer.memoryStorage(),
  limits: {
    fields: 0,
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
}).single('image');

export function createRecognitionUploadHandler(
  submit: RecognitionService['submit'],
): RequestHandler {
  return (request, response) => {
    // Multer parses multipart/form-data and puts the single accepted file on
    // request.file. The field name must match the frontend contract: image.
    upload(request, response, (error: unknown) => {
      void (async () => {
        // Use one generic public error so rejected uploads never leak
        // filenames, local paths, parser details, stack traces, or image bytes.
        if (error) {
          sendError(response, 'invalid_upload');
          return;
        }

        const image = request.file
          ? validateUploadedImage(request.file.buffer)
          : null;

        // Multer only proves that a file field arrived. This second check proves
        // the bytes decode as a supported image within the MVP limits.
        if (!image || !request.file) {
          sendError(response, 'invalid_upload');
          return;
        }

        const job = await submit({
          imageBuffer: request.file.buffer,
          mediaType: image.mediaType,
        });
        const body: RecognitionAccepted = {
          jobId: job.jobId,
          status: job.status,
        };

        response.status(202).json(body);
      })().catch((submitError: unknown) => {
        sendError(
          response,
          submitError instanceof RecognitionBusyError
            ? 'recognition_busy'
            : 'recognition_unavailable',
        );
      });
    });
  };
}
