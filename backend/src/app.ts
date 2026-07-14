import express, { type Express } from 'express';

export const app: Express = express();

app.get('/api/health', (_request, response) => {
  response.status(200).json({ status: 'ok' });
});
