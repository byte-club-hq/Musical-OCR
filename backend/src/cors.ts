import type { RequestHandler } from 'express';

const ALLOWED_METHODS = 'GET,POST,OPTIONS';
const DEFAULT_ALLOWED_HEADERS = 'Content-Type';

// `origin` comes from CORS_ORIGIN (see config.ts): `*` for local development
// with Expo web and phones on the LAN, one concrete origin for deployments.
export function createCors(origin: string): RequestHandler {
  return (request, response, next) => {
    response.setHeader('Access-Control-Allow-Origin', origin);
    response.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    response.setHeader(
      'Access-Control-Allow-Headers',
      request.header('Access-Control-Request-Headers') ??
        DEFAULT_ALLOWED_HEADERS,
    );

    if (origin !== '*') {
      response.setHeader('Vary', 'Origin');
    }

    if (request.method === 'OPTIONS') {
      response.sendStatus(204);
      return;
    }

    next();
  };
}
