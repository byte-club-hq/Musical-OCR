import { useCallback, useEffect, useRef, useState } from 'react';

import { fetchRecognitionStatus, uploadRecognitionImage } from './api';
import type { SelectedImage, UploadState } from './types';

const POLL_DELAY_MS = 1500;
// Generous on purpose: a job may wait in the backend queue before Audiveris
// (itself capped at a few minutes) even starts.
const POLL_TIMEOUT_MS = 10 * 60 * 1000;
const timeoutMessage = 'Recognition is taking too long. Please try again.';

type Options = {
  readonly pollDelayMs?: number;
  readonly pollTimeoutMs?: number;
};

// Owns one scan's lifecycle: upload -> poll status -> completed/failed.
// Screens render `state` and call the returned actions; they never fetch or
// poll themselves. Only the most recent upload may update the state.
export function useRecognitionUpload({
  pollDelayMs = POLL_DELAY_MS,
  pollTimeoutMs = POLL_TIMEOUT_MS,
}: Options = {}) {
  const [state, setState] = useState<UploadState>({ status: 'idle' });
  const [pollJobId, setPollJobId] = useState<string | null>(null);
  const latestJobId = useRef<string | null>(null);

  useEffect(() => {
    if (!pollJobId) {
      return undefined;
    }

    const startedAt = Date.now();
    let isCurrent = true;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;
    const isLatest = () => isCurrent && latestJobId.current === pollJobId;

    const fail = (message: string) => {
      setState({ message, status: 'failed' });
      setPollJobId(null);
    };

    const poll = async () => {
      try {
        const job = await fetchRecognitionStatus(pollJobId);

        if (!isLatest()) {
          return;
        }

        if (job.status === 'completed') {
          setState({
            jobId: job.jobId,
            pitches: job.pitches,
            status: 'completed',
          });
          setPollJobId(null);
          return;
        }

        if (job.status === 'failed') {
          fail(job.error.message);
          return;
        }

        if (Date.now() - startedAt >= pollTimeoutMs) {
          fail(timeoutMessage);
          return;
        }

        setState({
          jobId: job.jobId,
          status: job.status === 'processing' ? 'processing' : 'accepted',
        });
        pollTimeout = setTimeout(poll, pollDelayMs);
      } catch (error) {
        if (!isLatest()) {
          return;
        }

        fail(
          error instanceof Error
            ? error.message
            : 'Could not check recognition status.',
        );
      }
    };

    void poll();

    return () => {
      isCurrent = false;

      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [pollJobId, pollDelayMs, pollTimeoutMs]);

  const reset = useCallback(() => {
    latestJobId.current = null;
    setPollJobId(null);
    setState({ status: 'idle' });
  }, []);

  // For problems found before uploading, such as an unsupported file.
  const showError = useCallback((message: string) => {
    latestJobId.current = null;
    setPollJobId(null);
    setState({ message, status: 'failed' });
  }, []);

  const submit = useCallback(async (image: SelectedImage) => {
    setState({ status: 'uploading' });

    try {
      const result = await uploadRecognitionImage(image);
      latestJobId.current = result.jobId;
      setState({ jobId: result.jobId, status: 'accepted' });
      setPollJobId(result.jobId);
    } catch (error) {
      latestJobId.current = null;
      setPollJobId(null);
      setState({
        message:
          error instanceof Error
            ? error.message
            : 'Could not upload this image. Please try again.',
        status: 'failed',
      });
    }
  }, []);

  return { reset, showError, state, submit };
}
