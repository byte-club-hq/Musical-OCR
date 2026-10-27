import { StyleSheet, Text, View } from 'react-native';

import type { SelectedImage } from '../types';

type ImageSummaryProps = {
  readonly image: SelectedImage | null;
};

export function ImageSummary({ image }: ImageSummaryProps) {
  if (!image) {
    return (
      <View style={styles.summary}>
        <Text style={styles.label}>Input rules</Text>
        <Text style={styles.value}>
          PNG or JPEG, one image only, maximum 10 MB.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.summary}>
      <SummaryLine label="File" value={image.name ?? 'Name unavailable'} />
      <SummaryLine label="Type" value={image.mimeType ?? 'Type unavailable'} />
      <SummaryLine label="Size" value={formatSize(image.size)} />
      <SummaryLine label="Image" value={formatDimensions(image)} />
    </View>
  );
}

function SummaryLine({
  label,
  value,
}: {
  readonly label: string;
  readonly value: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function formatSize(size: number | null): string {
  if (size === null) {
    return 'Size unavailable';
  }

  return `${(size / 1024 / 1024).toFixed(2)} MB`;
}

function formatDimensions(image: SelectedImage): string {
  if (image.width === null || image.height === null) {
    return 'Dimensions unavailable';
  }

  return `${image.width} x ${image.height}px`;
}

const styles = StyleSheet.create({
  label: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    gap: 4,
  },
  summary: {
    gap: 12,
  },
  value: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
});
