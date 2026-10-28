import type { PitchItem } from '@musical-ocr/shared';

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export type SelectedImage = {
  readonly uri: string;
  readonly name: string | null;
  readonly mimeType: string | null;
  readonly size: number | null;
  readonly width: number | null;
  readonly height: number | null;
  readonly file?: File;
};

export type PickImageResult =
  | { readonly status: 'selected'; readonly image: SelectedImage }
  | { readonly status: 'cancelled' }
  | { readonly status: 'invalid'; readonly message: string };

// Everything the screen shows about one scan, from upload to result.
// Owned by useRecognitionUpload; components only read it.
export type UploadState =
  | { readonly status: 'idle' }
  | { readonly status: 'uploading' }
  | { readonly status: 'accepted'; readonly jobId: string }
  | { readonly status: 'processing'; readonly jobId: string }
  | {
      readonly status: 'completed';
      readonly jobId: string;
      readonly pitches: readonly PitchItem[];
    }
  | { readonly status: 'failed'; readonly message: string };
