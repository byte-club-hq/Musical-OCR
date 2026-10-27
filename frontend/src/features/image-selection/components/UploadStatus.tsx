import { StyleSheet, Text, View } from 'react-native';

import type { UploadState } from '../types';

type UploadStatusProps = {
  readonly uploadState: UploadState;
};

export function UploadStatus({ uploadState }: UploadStatusProps) {
  if (uploadState.status === 'idle') {
    return null;
  }

  const message =
    uploadState.status === 'uploading'
      ? 'Uploading image...'
      : uploadState.status === 'accepted'
        ? `Upload accepted. Job ${uploadState.jobId} is pending.`
        : uploadState.status === 'processing'
          ? `Recognition job ${uploadState.jobId} is processing.`
          : uploadState.status === 'completed'
            ? `Recognition job ${uploadState.jobId} completed.`
            : uploadState.message;

  return (
    <View
      accessibilityRole={uploadState.status === 'failed' ? 'alert' : 'text'}
      style={[
        styles.status,
        uploadState.status === 'accepted' && styles.accepted,
        uploadState.status === 'completed' && styles.accepted,
        uploadState.status === 'failed' && styles.failed,
      ]}
    >
      <Text
        style={[
          styles.message,
          uploadState.status === 'accepted' && styles.acceptedText,
          uploadState.status === 'completed' && styles.acceptedText,
          uploadState.status === 'failed' && styles.failedText,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  accepted: {
    backgroundColor: '#ecfdf5',
    borderColor: '#86efac',
  },
  acceptedText: {
    color: '#166534',
  },
  failed: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  failedText: {
    color: '#991b1b',
  },
  message: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  status: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
});
