import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { SelectedImage } from '../src/features/image-selection/types';
import { useRecognitionUpload } from '../src/features/image-selection/useRecognitionUpload';

const image: SelectedImage = {
  height: 1400,
  mimeType: 'image/png',
  name: 'score.png',
  size: 1024,
  uri: 'file:///score.png',
  width: 1000,
};

function jsonResponse(body: unknown): Response {
  return { json: async () => body, ok: true } as Response;
}

let fetchMock: jest.MockedFunction<typeof fetch>;

beforeEach(() => {
  fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
  globalThis.fetch = fetchMock;
});

describe('useRecognitionUpload', () => {
  it('keeps the pitches of a completed job', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ jobId: 'job-1', status: 'pending' }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          jobId: 'job-1',
          musicXmlReady: true,
          pitches: [{ octave: 4, step: 'C' }],
          status: 'completed',
        }),
      );
    const { result } = await renderHook(() => useRecognitionUpload());

    await act(async () => {
      await result.current.submit(image);
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        jobId: 'job-1',
        pitches: [{ octave: 4, step: 'C' }],
        status: 'completed',
      });
    });
  });

  it('gives up polling after the timeout', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ jobId: 'job-1', status: 'pending' }),
      )
      .mockResolvedValue(
        jsonResponse({ jobId: 'job-1', status: 'processing' }),
      );
    const { result } = await renderHook(() =>
      useRecognitionUpload({ pollDelayMs: 5, pollTimeoutMs: 30 }),
    );

    await act(async () => {
      await result.current.submit(image);
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        message: 'Recognition is taking too long. Please try again.',
        status: 'failed',
      });
    });
    const callsAfterTimeout = fetchMock.mock.calls.length;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterTimeout);
  });

  it('ignores status responses for a job that was reset', async () => {
    let answerStatus: (response: Response) => void = () => undefined;
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ jobId: 'job-1', status: 'pending' }),
      )
      .mockReturnValueOnce(
        new Promise<Response>((resolve) => {
          answerStatus = resolve;
        }),
      );
    const { result } = await renderHook(() => useRecognitionUpload());

    await act(async () => {
      await result.current.submit(image);
    });
    act(() => {
      result.current.reset();
    });
    await act(async () => {
      answerStatus(
        jsonResponse({
          jobId: 'job-1',
          musicXmlReady: true,
          pitches: [],
          status: 'completed',
        }),
      );
    });

    expect(result.current.state).toEqual({ status: 'idle' });
  });
});
