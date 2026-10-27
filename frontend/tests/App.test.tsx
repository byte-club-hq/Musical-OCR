import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import { App } from '../src/App';
import { apiBaseUrl } from '../src/config/api';
import { pickSheetMusicImage } from '../src/features/image-selection/picker';
import type { PickImageResult } from '../src/features/image-selection/types';

jest.mock('../src/features/image-selection/picker', () => ({
  pickSheetMusicImage: jest.fn(),
}));

const mockedPickSheetMusicImage = jest.mocked(pickSheetMusicImage);
let fetchMock: jest.MockedFunction<typeof fetch>;

const selectedImage: PickImageResult = {
  image: {
    height: 1400,
    mimeType: 'image/png',
    name: 'score.png',
    size: 1024 * 1024,
    uri: 'file:///score.png',
    width: 1000,
  },
  status: 'selected',
};

describe('App', () => {
  beforeEach(() => {
    mockedPickSheetMusicImage.mockReset();
    fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
    globalThis.fetch = fetchMock;
  });

  it('renders the empty scanner state', async () => {
    const { getByLabelText, getByText } = await render(<App />);

    expect(getByText('Sheet Music Scanner')).toBeTruthy();
    expect(getByText('No image selected')).toBeTruthy();
    expect(
      getByText('PNG or JPEG, one image only, maximum 10 MB.'),
    ).toBeTruthy();
    expect(getByLabelText('Scan sheet music').props.accessibilityState).toEqual(
      {
        disabled: true,
      },
    );
  });

  it('shows a selected image summary', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);

    const { findByText, getByLabelText, getByText } = await render(<App />);
    await press(getByLabelText('Choose image'));

    expect(await findByText('score.png')).toBeTruthy();
    expect(getByText('image/png')).toBeTruthy();
    expect(getByText('1.00 MB')).toBeTruthy();
    expect(getByText('1000 x 1400px')).toBeTruthy();
  });

  it('removes a selected image', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);

    const { findByText, getByLabelText, getByText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Remove selected image'));

    await waitFor(() => {
      expect(getByText('No image selected')).toBeTruthy();
    });
  });

  it('replaces a selected image', async () => {
    mockedPickSheetMusicImage
      .mockResolvedValueOnce(selectedImage)
      .mockResolvedValueOnce({
        image: {
          height: 1600,
          mimeType: 'image/jpeg',
          name: 'replacement.jpg',
          size: 2 * 1024 * 1024,
          uri: 'file:///replacement.jpg',
          width: 1200,
        },
        status: 'selected',
      });

    const { findByText, getByLabelText, queryByText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Replace selected image'));

    expect(await findByText('replacement.jpg')).toBeTruthy();
    expect(queryByText('score.png')).toBeNull();
  });

  it('submits the selected image and shows the accepted job id', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'pending' }),
        ok: true,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'pending' }),
        ok: true,
      } as Response);

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Scan sheet music'));

    expect(
      await findByText('Upload accepted. Job job-123 is pending.'),
    ).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/recognitions`,
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBaseUrl}/api/recognitions/job-123`,
    );
  });

  it('polls the recognition status and shows processing', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'pending' }),
        ok: true,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'processing' }),
        ok: true,
      } as Response);

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Scan sheet music'));

    expect(
      await findByText('Recognition job job-123 is processing.'),
    ).toBeTruthy();
  });

  it('polls the recognition status and shows completion', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'pending' }),
        ok: true,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'completed' }),
        ok: true,
      } as Response);

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Scan sheet music'));

    expect(await findByText('Recognition job job-123 completed.')).toBeTruthy();
  });

  it('polls the recognition status and shows a failed job message', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);
    fetchMock
      .mockResolvedValueOnce({
        json: async () => ({ jobId: 'job-123', status: 'pending' }),
        ok: true,
      } as Response)
      .mockResolvedValueOnce({
        json: async () => ({
          error: { message: 'Could not process this image.' },
          jobId: 'job-123',
          status: 'failed',
        }),
        ok: true,
      } as Response);

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Scan sheet music'));

    expect(await findByText('Could not process this image.')).toBeTruthy();
  });

  it('shows a backend upload failure message', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);
    fetchMock.mockResolvedValueOnce({
      json: async () => ({
        error: {
          message: 'Upload must be one PNG or JPEG image up to 10 MB.',
        },
      }),
      ok: false,
    } as Response);

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Scan sheet music'));

    expect(
      await findByText('Upload must be one PNG or JPEG image up to 10 MB.'),
    ).toBeTruthy();
  });

  it('shows a local invalid selection message', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce({
      message: 'Choose a PNG or JPEG image.',
      status: 'invalid',
    });

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));

    expect(await findByText('Choose a PNG or JPEG image.')).toBeTruthy();
  });

  it('disables actions while an upload is in progress', async () => {
    mockedPickSheetMusicImage.mockResolvedValueOnce(selectedImage);
    fetchMock.mockReturnValueOnce(new Promise(() => undefined));

    const { findByText, getByLabelText } = await render(<App />);
    await press(getByLabelText('Choose image'));
    await findByText('score.png');

    await press(getByLabelText('Scan sheet music'));

    await waitFor(() => {
      expect(
        getByLabelText('Scan sheet music').props.accessibilityState,
      ).toEqual({
        disabled: true,
      });
      expect(
        getByLabelText('Replace selected image').props.accessibilityState,
      ).toEqual({
        disabled: true,
      });
      expect(
        getByLabelText('Remove selected image').props.accessibilityState,
      ).toEqual({
        disabled: true,
      });
    });
  });
});

async function press(element: Parameters<typeof fireEvent.press>[0]) {
  await act(async () => {
    fireEvent.press(element);
  });
}
