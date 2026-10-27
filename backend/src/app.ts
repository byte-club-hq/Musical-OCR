import express, { type Express, type Response } from 'express';

import { allowAllCors } from './cors.ts';
import {
  createRecognitionService,
  type RecognitionService,
} from './recognition/service.ts';
import { createRecognitionUploadHandler } from './uploads/recognition-upload.ts';

type CreateAppOptions = {
  readonly recognition?: RecognitionService;
};

// Audiveris exports compressed MusicXML (.mxl), which MuseScore opens directly.
const MXL_CONTENT_TYPE = 'application/vnd.recordare.musicxml';
const MXL_DOWNLOAD_NAME = 'sheet-music.mxl';

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();
  const recognition = options.recognition ?? createRecognitionService();

  app.use(allowAllCors);

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.post(
    '/api/recognitions',
    createRecognitionUploadHandler(recognition.submit),
  );

  app.get('/api/recognitions/:id', (request, response) => {
    const job = recognition.getJob(request.params.id);

    if (!job) {
      sendNotFound(response);
      return;
    }

    response.status(200).json(job);
  });

  app.get('/api/recognitions/:id/musicxml', (request, response) => {
    const job = recognition.getJob(request.params.id);
    const musicXml = recognition.getMusicXml(request.params.id);

    if (!job) {
      sendNotFound(response);
      return;
    }

    if (job.status === 'failed') {
      response.status(409).json({
        error: {
          code: 'musicxml_unavailable',
          message: 'This recognition failed, so no MusicXML is available.',
        },
      });
      return;
    }

    if (job.status !== 'completed' || !musicXml) {
      response.status(409).json({
        error: {
          code: 'musicxml_not_ready',
          message: 'MusicXML is not ready yet. Try again shortly.',
        },
      });
      return;
    }

    response
      .status(200)
      .type(MXL_CONTENT_TYPE)
      .attachment(MXL_DOWNLOAD_NAME)
      .send(musicXml);
  });

  return app;
}

function sendNotFound(response: Response): void {
  response.status(404).json({
    error: {
      code: 'recognition_not_found',
      message: 'Recognition job was not found.',
    },
  });
}
