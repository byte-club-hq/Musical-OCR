import { StyleSheet, Text, View } from 'react-native';

export function App() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.title}>
        Sheet Music Scanner
      </Text>
      <Text style={styles.description}>
        Convert printed sheet music images into editable MusicXML files.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  description: {
    color: '#334155',
    fontSize: 18,
    lineHeight: 26,
    maxWidth: 520,
    textAlign: 'center',
  },
  screen: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: '#0f172a',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
});
