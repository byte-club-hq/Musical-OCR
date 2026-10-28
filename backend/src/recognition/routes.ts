import type { RecognitionResult } from '@musical-ocr/shared';
import { Router } from 'express';

import { sendError } from '../http/errors.ts';
import { createRecognitionUploadHandler } from '../uploads/recognition-upload.ts';
import type { RecognitionService } from './service.ts';

// Audiveris exports compressed MusicXML (.mxl), which MuseScore opens directly.
const MXL_CONTENT_TYPE = 'application/vnd.recordare.musicxml';
const MXL_DOWNLOAD_NAME = 'sheet-music.mxl';

// Mounted at /api/recognitions. Handlers stay thin: they translate HTTP to
// service calls and service results to the shared response shapes.
export function createRecognitionRouter(
  recognition: RecognitionService,
): Router {
  const router = Router();

  router.post('/', createRecognitionUploadHandler(recognition.submit));

  router.get('/:id', (request, response) => {
    const job: RecognitionResult | undefined = recognition.getJob(
      request.params.id,
    );

    if (!job) {
      sendError(response, 'recognition_not_found');
      return;
    }

    response.status(200).json(job);
  });

  router.get('/:id/musicxml', (request, response) => {
    const job = recognition.getJob(request.params.id);
    const musicXml = recognition.getMusicXml(request.params.id);

    if (!job) {
      sendError(response, 'recognition_not_found');
      return;
    }

    if (job.status === 'failed') {
      sendError(response, 'musicxml_unavailable');
      return;
    }

    if (job.status !== 'completed' || !musicXml) {
      sendError(response, 'musicxml_not_ready');
      return;
    }

    response
      .status(200)
      .type(MXL_CONTENT_TYPE)
      .attachment(MXL_DOWNLOAD_NAME)
      .send(musicXml);
  });

  return router;
}
