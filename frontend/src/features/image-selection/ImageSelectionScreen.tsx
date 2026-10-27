import { useEffect, useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionButton } from './components/ActionButton';
import { ImagePreview } from './components/ImagePreview';
import { ImageSummary } from './components/ImageSummary';
import { UploadStatus } from './components/UploadStatus';
import {
  fetchRecognitionStatus,
  musicXmlDownloadUrl,
  uploadRecognitionImage,
} from './api';
import { pickSheetMusicImage } from './picker';
import type { SelectedImage, UploadState } from './types';

const POLL_DELAY_MS = 1500;

export function ImageSelectionScreen() {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(
    null,
  );
  const [uploadState, setUploadState] = useState<UploadState>({
    status: 'idle',
  });
  const [pollJobId, setPollJobId] = useState<string | null>(null);
  const latestJobId = useRef<string | null>(null);

  const isUploading = uploadState.status === 'uploading';

  useEffect(() => {
    if (!pollJobId) {
      return undefined;
    }

    let isCurrent = true;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      try {
        const job = await fetchRecognitionStatus(pollJobId);

        if (!isCurrent || latestJobId.current !== pollJobId) {
          return;
        }

        if (job.status === 'completed') {
          setUploadState({ jobId: job.jobId, status: 'completed' });
          setPollJobId(null);
          return;
        }

        if (job.status === 'failed') {
          setUploadState({
            message: job.error?.message ?? 'Could not process this image.',
            status: 'failed',
          });
          setPollJobId(null);
          return;
        }

        setUploadState({
          jobId: job.jobId,
          status: job.status === 'processing' ? 'processing' : 'accepted',
        });
        pollTimeout = setTimeout(poll, POLL_DELAY_MS);
      } catch (error) {
        if (!isCurrent || latestJobId.current !== pollJobId) {
          return;
        }

        setUploadState({
          message:
            error instanceof Error
              ? error.message
              : 'Could not check recognition status.',
          status: 'failed',
        });
        setPollJobId(null);
      }
    };

    void poll();

    return () => {
      isCurrent = false;

      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }, [pollJobId]);

  const chooseImage = async () => {
    const result = await pickSheetMusicImage();

    if (result.status === 'cancelled') {
      return;
    }

    if (result.status === 'invalid') {
      latestJobId.current = null;
      setPollJobId(null);
      setUploadState({ message: result.message, status: 'failed' });
      return;
    }

    setSelectedImage(result.image);
    latestJobId.current = null;
    setPollJobId(null);
    setUploadState({ status: 'idle' });
  };

  const removeImage = () => {
    setSelectedImage(null);
    latestJobId.current = null;
    setPollJobId(null);
    setUploadState({ status: 'idle' });
  };

  const scanImage = async () => {
    if (!selectedImage || isUploading) {
      return;
    }

    setUploadState({ status: 'uploading' });

    try {
      const result = await uploadRecognitionImage(selectedImage);
      latestJobId.current = result.jobId;
      setUploadState({ jobId: result.jobId, status: 'accepted' });
      setPollJobId(result.jobId);
    } catch (error) {
      latestJobId.current = null;
      setPollJobId(null);
      setUploadState({
        message:
          error instanceof Error
            ? error.message
            : 'Could not upload this image. Please try again.',
        status: 'failed',
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>
          Sheet Music Scanner
        </Text>
        <Text style={styles.description}>
          Choose one printed sheet-music image and send it for MusicXML
          recognition.
        </Text>
      </View>

      <View style={styles.panel}>
        <ImagePreview image={selectedImage} />
        <ImageSummary image={selectedImage} />

        <View style={styles.actions}>
          <ActionButton
            accessibilityLabel={
              selectedImage ? 'Replace selected image' : 'Choose image'
            }
            disabled={isUploading}
            label={selectedImage ? 'Replace image' : 'Choose image'}
            onPress={chooseImage}
            variant="secondary"
          />

          {selectedImage ? (
            <ActionButton
              accessibilityLabel="Remove selected image"
              disabled={isUploading}
              label="Remove"
              onPress={removeImage}
              variant="danger"
            />
          ) : null}

          <ActionButton
            accessibilityLabel="Scan sheet music"
            disabled={!selectedImage || isUploading}
            label={isUploading ? 'Uploading...' : 'Scan sheet music'}
            onPress={scanImage}
          />
        </View>

        <UploadStatus uploadState={uploadState} />

        {uploadState.status === 'completed' ? (
          // The browser (web) or system handler (mobile) downloads the .mxl.
          // TODO: platform-specific sharing and opening in MuseScore.
          <ActionButton
            accessibilityLabel="Download MusicXML"
            label="Download MusicXML"
            onPress={() => {
              void Linking.openURL(musicXmlDownloadUrl(uploadState.jobId));
            }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  description: {
    color: '#334155',
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 640,
    textAlign: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#dbe3ec',
    borderRadius: 8,
    borderWidth: 1,
    gap: 20,
    maxWidth: 720,
    padding: 20,
    width: '100%',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    gap: 28,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#0f172a',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
});
