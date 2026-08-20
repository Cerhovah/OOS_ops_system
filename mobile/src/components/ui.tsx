import { type ReactElement, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/constants/app';

export function Screen({
  children,
  refreshControl,
}: {
  children: ReactNode;
  refreshControl?: ReactElement<RefreshControlProps>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.screen}
        keyboardShouldPersistTaps="handled"
        refreshControl={refreshControl}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Heading({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <View style={styles.headingWrap}>
      <Text style={styles.heading}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'plain';

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
      />
    </View>
  );
}

export function ChoiceRow({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceRow}>
        {choices.map((choice) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: value === choice.value }}
            key={choice.value}
            onPress={() => onChange(choice.value)}
            style={[styles.choice, value === choice.value && styles.choiceSelected]}>
            <Text style={[styles.choiceText, value === choice.value && styles.choiceTextSelected]}>{choice.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Sheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <AppButton label="닫기" onPress={onClose} variant="plain" />
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

export function StatusBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>{message}</Text>
      {onClose ? <AppButton label="확인" variant="plain" onPress={onClose} /> : null}
    </View>
  );
}

export function LoadingView() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={COLORS.accent} />
      <Text style={styles.subtitle}>로컬 데이터를 여는 중입니다.</Text>
    </View>
  );
}

export const textStyles = StyleSheet.create({
  title: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  body: { color: COLORS.text, fontSize: 15, lineHeight: 21 },
  muted: { color: COLORS.muted, fontSize: 13, lineHeight: 18 },
  number: { color: COLORS.text, fontSize: 16, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { padding: 16, paddingBottom: 112, gap: 16 },
  headingWrap: { gap: 4 },
  heading: { color: COLORS.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 20 },
  section: { gap: 10 },
  sectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  button: { minHeight: 48, minWidth: 48, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  button_primary: { backgroundColor: COLORS.accent },
  button_secondary: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent, borderWidth: 1 },
  button_danger: { backgroundColor: COLORS.dangerSoft, borderColor: COLORS.danger, borderWidth: 1 },
  button_plain: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  buttonText_primary: { color: '#FFFFFF' },
  buttonText_secondary: { color: COLORS.accent },
  buttonText_danger: { color: COLORS.danger },
  buttonText_plain: { color: COLORS.accent },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  fieldWrap: { gap: 6 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 48, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, paddingHorizontal: 12, fontSize: 16 },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  choiceSelected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  choiceText: { color: COLORS.text, fontSize: 14 },
  choiceTextSelected: { color: COLORS.accent, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sheetHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  sheetTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sheetContent: { padding: 16, paddingBottom: 40, gap: 14 },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: COLORS.warningSoft, borderRadius: 10, paddingLeft: 12 },
  bannerText: { flex: 1, color: COLORS.warning, fontSize: 14, lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.background },
});
