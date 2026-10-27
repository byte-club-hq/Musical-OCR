import {
  Pressable,
  type PressableStateCallbackType,
  StyleSheet,
  Text,
} from 'react-native';

type ActionButtonProps = {
  readonly accessibilityLabel: string;
  readonly disabled?: boolean;
  readonly label: string;
  readonly onPress: () => void;
  readonly variant?: 'primary' | 'secondary' | 'danger';
};

export function ActionButton({
  accessibilityLabel,
  disabled = false,
  label,
  onPress,
  variant = 'primary',
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.button,
        styles[variant],
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant !== 'primary' && styles.secondaryLabel,
          disabled && styles.disabledLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  danger: {
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
  },
  disabled: {
    backgroundColor: '#e2e8f0',
    borderColor: '#cbd5e1',
  },
  disabledLabel: {
    color: '#64748b',
  },
  label: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.78,
  },
  primary: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8',
  },
  secondary: {
    backgroundColor: '#ffffff',
    borderColor: '#94a3b8',
  },
  secondaryLabel: {
    color: '#0f172a',
  },
});
