import express, { type Express } from 'express';

import { loadConfig, type AppConfig } from './config.ts';
import { createCors } from './cors.ts';
import { createErrorHandler, notFoundHandler } from './http/errors.ts';
import { silentLogger, type Logger } from './logger.ts';
import { createRecognitionRouter } from './recognition/routes.ts';
import {
  createRecognitionService,
  type RecognitionService,
} from './recognition/service.ts';

type CreateAppOptions = {
  // Defaults to the built-in defaults, not process.env; index.ts passes the
  // real environment.
  readonly config?: AppConfig;
  readonly logger?: Logger;
  // Tests pass a service with a fake Audiveris runner.
  readonly recognition?: RecognitionService;
};

export function createApp(options: CreateAppOptions = {}): Express {
  const config = options.config ?? loadConfig({});
  const logger = options.logger ?? silentLogger;
  const recognition =
    options.recognition ??
    createRecognitionService({
      limits: config.recognition,
      audiveris: config.audiveris,
      logger,
    });
  const app = express();

  app.disable('x-powered-by');
  app.use(createCors(config.corsOrigin));

  app.get('/api/health', (_request, response) => {
    response.status(200).json({ status: 'ok' });
  });

  app.use('/api/recognitions', createRecognitionRouter(recognition));

  // Keep these last: JSON 404 for unknown routes, then the safe error handler.
  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
