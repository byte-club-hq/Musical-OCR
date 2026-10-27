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

export type UploadState =
  | { readonly status: 'idle' }
  | { readonly status: 'uploading' }
  | { readonly status: 'accepted'; readonly jobId: string }
  | { readonly status: 'processing'; readonly jobId: string }
  | { readonly status: 'completed'; readonly jobId: string }
  | { readonly status: 'failed'; readonly message: string };

export type RecognitionJobStatus =
  | { readonly status: 'pending'; readonly jobId: string }
  | { readonly status: 'processing'; readonly jobId: string }
  | { readonly status: 'completed'; readonly jobId: string }
  | {
      readonly status: 'failed';
      readonly jobId: string;
      readonly error?: {
        readonly message?: string;
      };
    };
