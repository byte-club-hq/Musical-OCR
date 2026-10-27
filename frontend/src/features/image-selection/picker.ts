import * as ImagePicker from 'expo-image-picker';

import {
  MAX_IMAGE_BYTES,
  type PickImageResult,
  type SelectedImage,
} from './types';

const supportedMimeTypes = new Set(['image/png', 'image/jpeg']);
const supportedExtensions = /\.(png|jpe?g)$/i;

export async function pickSheetMusicImage(): Promise<PickImageResult> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: false,
    allowsMultipleSelection: false,
    mediaTypes: ['images'],
    quality: 1,
  });

  if (result.canceled) {
    return { status: 'cancelled' };
  }

  const asset = result.assets[0];

  if (!asset) {
    return {
      status: 'invalid',
      message: 'Could not read the selected image. Please try another file.',
    };
  }

  const image: SelectedImage = {
    ...(asset.file ? { file: asset.file } : {}),
    height: asset.height || null,
    mimeType: asset.mimeType ?? asset.file?.type ?? null,
    name: asset.fileName ?? asset.file?.name ?? null,
    size: asset.fileSize ?? asset.file?.size ?? null,
    uri: asset.uri,
    width: asset.width || null,
  };

  return validateSelectedImage(image);
}

export function validateSelectedImage(image: SelectedImage): PickImageResult {
  if (image.mimeType && !supportedMimeTypes.has(image.mimeType)) {
    return {
      status: 'invalid',
      message: 'Choose a PNG or JPEG image.',
    };
  }

  if (!image.mimeType && image.name && !supportedExtensions.test(image.name)) {
    return {
      status: 'invalid',
      message: 'Choose a PNG or JPEG image.',
    };
  }

  if (image.size !== null && image.size > MAX_IMAGE_BYTES) {
    return {
      status: 'invalid',
      message: 'Choose an image that is 10 MB or smaller.',
    };
  }

  return { image, status: 'selected' };
}
