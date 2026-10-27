import express, { type Express } from 'express';

import { allowAllCors } from './cors.ts';
import { getRecognitionJob } from './recognition/jobs.ts';
import { createRecognitionUploadHandler } from './uploads/recognition-upload.ts';

type CreateAppOptions = {
  readonly startRecognitionJob?: Parameters<
    typeof createRecognitionUploadHandler
  >[0];
};

export function createApp(options: CreateAppOptions = {}): Express {
  const app = express();

  app.use(allowAllCors);

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.post(
    '/api/recognitions',
    createRecognitionUploadHandler(options.startRecognitionJob),
  );

  app.get('/api/recognitions/:id', (request, response) => {
    const job = getRecognitionJob(request.params.id);

    if (!job) {
      response.status(404).json({
        error: {
          code: 'recognition_not_found',
          message: 'Recognition job was not found.',
        },
      });
      return;
    }

    response.status(200).json(job);
  });

  return app;
}

export const app: Express = createApp();
