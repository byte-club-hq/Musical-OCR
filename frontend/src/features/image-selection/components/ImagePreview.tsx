import { Image, StyleSheet, Text, View } from 'react-native';

import type { SelectedImage } from '../types';

type ImagePreviewProps = {
  readonly image: SelectedImage | null;
};

export function ImagePreview({ image }: ImagePreviewProps) {
  if (!image) {
    return (
      <View style={styles.emptyPreview}>
        <Text style={styles.emptyText}>No image selected</Text>
      </View>
    );
  }

  return (
    <View style={styles.preview}>
      <Image
        accessibilityLabel="Selected sheet music preview"
        resizeMode="contain"
        source={{ uri: image.uri }}
        style={styles.image}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  emptyPreview: {
    alignItems: 'center',
    aspectRatio: 4 / 3,
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'center',
    width: '100%',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  preview: {
    aspectRatio: 4 / 3,
    backgroundColor: '#f8fafc',
    borderColor: '#cbd5e1',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    width: '100%',
  },
});
