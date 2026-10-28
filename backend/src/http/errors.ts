import type { ApiErrorCode } from '@musical-ocr/shared';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

import type { Logger } from '../logger.ts';

// The single place that decides HTTP status codes and user-facing messages
// for API errors. Add a new code to ApiErrorCode in shared/src/index.ts first,
// then here; TypeScript will refuse to compile until both agree.
const apiErrors: Record<
  ApiErrorCode,
  { readonly status: number; readonly message: string }
> = {
  invalid_upload: {
    status: 400,
    message: 'Upload must be one PNG or JPEG image up to 10 MB.',
  },
  recognition_busy: {
    status: 503,
    message: 'The scanner is busy right now. Please try again in a minute.',
  },
  recognition_unavailable: {
    status: 500,
    message: 'Could not start recognition for this image.',
  },
  recognition_not_found: {
    status: 404,
    message: 'Recognition job was not found.',
  },
  musicxml_not_ready: {
    status: 409,
    message: 'MusicXML is not ready yet. Try again shortly.',
  },
  musicxml_unavailable: {
    status: 409,
    message: 'This recognition failed, so no MusicXML is available.',
  },
  not_found: {
    status: 404,
    message: 'This API route does not exist.',
  },
  internal_error: {
    status: 500,
    message: 'Something went wrong on the server.',
  },
};

export function sendError(response: Response, code: ApiErrorCode): void {
  const { status, message } = apiErrors[code];

  response.status(status).json({ error: { code, message } });
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  sendError(response, 'not_found');
};

// Express calls this for errors thrown in route handlers. Never echo the error
// itself: messages and stacks can contain paths or other internal details.
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    logger.error('http.unhandled_error', {
      method: request.method,
      errorName: error instanceof Error ? error.name : typeof error,
    });
    sendError(response, 'internal_error');
  };
}
