import type { RequestHandler } from 'express';

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const DEFAULT_ALLOWED_HEADERS = 'Content-Type';

export function createCors(origin: string): RequestHandler {
  return (request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    response.setHeader(
      'Access-Control-Allow-Headers',
      request.header('Access-Control-Request-Headers') ??
        DEFAULT_ALLOWED_HEADERS,
    );

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  };
}
