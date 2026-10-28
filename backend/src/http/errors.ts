import type { ApiErrorCode } from '@musical-ocr/shared';
import type { ErrorRequestHandler, RequestHandler, Response } from 'express';

import type { Logger } from '../logger.ts';

// Status and user-facing message for every ApiErrorCode in @musical-ocr/shared.
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

// Never echo the error itself; messages and stacks can contain local paths.
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (error: unknown, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    logger.error('http.unhandled_error', {
      method: request.method,
      path: request.path,
    });
    sendError(response, 'internal_error');
  };
}
