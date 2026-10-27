import express, { type Express } from 'express';

import { allowAllCors } from './cors.ts';
import { acceptRecognitionUpload } from './uploads/recognition-upload.ts';

export const app: Express = express();

app.use(allowAllCors);

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});

app.post('/api/recognitions', acceptRecognitionUpload);
