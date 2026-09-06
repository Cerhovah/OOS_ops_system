import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  findNodeHandle,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type AccessibilityState,
  type KeyboardTypeOptions,
  type RefreshControlProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

import { adjustTime, setTimeHour, setTimeMinute, timeParts } from './time';

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
      <Text accessibilityRole="header" style={styles.heading}>{children}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
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
  accessibilityState,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityState?: AccessibilityState;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        styles[`button_${variant}`],
        style,
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

export function TimeField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const current = timeParts(value);
  const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

  return (
    <>
      <View style={styles.fieldWrap}>
        <Text style={styles.label}>{label}</Text>
        <AppButton label={`${value} · 시간 선택`} variant="secondary" onPress={() => setVisible(true)} />
      </View>
      <Sheet visible={visible} title={`${label} 선택`} onClose={() => setVisible(false)}>
        <Text style={styles.timeValue}>{value}</Text>
        <Text style={styles.label}>시</Text>
        <View style={styles.choiceRow}>
          {Array.from({ length: 24 }, (_, hour) => (
            <AppButton
              key={hour}
              label={`${String(hour).padStart(2, '0')}시`}
              variant={current.hour === hour ? 'primary' : 'secondary'}
              accessibilityState={{ selected: current.hour === hour }}
              onPress={() => onChange(setTimeHour(value, hour))}
            />
          ))}
        </View>
        <Text style={styles.label}>분</Text>
        <View style={styles.choiceRow}>
          {minutes.map((minute) => (
            <AppButton
              key={minute}
              label={`${String(minute).padStart(2, '0')}분`}
              variant={current.minute === minute ? 'primary' : 'secondary'}
              accessibilityState={{ selected: current.minute === minute }}
              onPress={() => {
                onChange(setTimeMinute(value, minute));
                setVisible(false);
              }}
            />
          ))}
        </View>
        <View style={styles.choiceRow}>
          <AppButton label="−1분" variant="secondary" onPress={() => onChange(adjustTime(value, -1))} />
          <AppButton label="+1분" variant="secondary" onPress={() => onChange(adjustTime(value, 1))} />
          <AppButton label="선택 완료" onPress={() => setVisible(false)} />
        </View>
      </Sheet>
    </>
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
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choiceRow}>
        {choices.map((choice) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel={`${label}: ${choice.label}`}
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
  footer,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const { fontScale } = useWindowDimensions();
  const reduceMotion = useReduceMotion();
  const titleRef = useRef<Text>(null);

  function focusTitle() {
    const handle = findNodeHandle(titleRef.current);
    if (handle !== null) AccessibilityInfo.setAccessibilityFocus(handle);
  }

  return (
    <Modal
      visible={visible}
      animationType={reduceMotion ? 'none' : 'slide'}
      transparent
      onShow={focusTitle}
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <SafeAreaView
          accessibilityViewIsModal
          style={[styles.sheet, fontScale >= 1.8 && styles.sheetFull]}
          edges={['bottom']}>
          <View style={styles.sheetHeader}>
            <Text ref={titleRef} accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
            <AppButton label="닫기" onPress={onClose} variant="plain" />
          </View>
          <ScrollView
            contentContainerStyle={styles.sheetContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={styles.sheetFooter}>{footer}</View> : null}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function useReduceMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setEnabled(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return enabled;
}

export function StatusBanner({ message, onClose }: { message: string; onClose?: () => void }) {
  return (
    <View style={styles.banner}>
      <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.bannerText}>{message}</Text>
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
  title: { color: COLORS.text, fontSize: tokens.type.body, fontWeight: '700' },
  body: { color: COLORS.text, fontSize: tokens.type.body, lineHeight: 23 },
  muted: { color: COLORS.muted, fontSize: tokens.type.caption, lineHeight: 19 },
  number: { color: COLORS.text, fontSize: tokens.type.body, fontVariant: ['tabular-nums'] },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  screen: { paddingHorizontal: tokens.space.md, paddingTop: tokens.space.lg, paddingBottom: 112, gap: tokens.space.lg },
  headingWrap: { gap: tokens.space.xxs },
  heading: { color: COLORS.text, fontSize: tokens.type.heading, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: COLORS.muted, fontSize: tokens.type.caption, lineHeight: 19 },
  timeValue: { color: COLORS.text, fontSize: 30, fontWeight: '800', textAlign: 'center', fontVariant: ['tabular-nums'] },
  section: { gap: tokens.space.xs },
  sectionHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  card: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: tokens.radius.card, borderWidth: 1, padding: tokens.space.md, gap: tokens.space.xs },
  button: { minHeight: tokens.hitTarget, minWidth: tokens.hitTarget, borderRadius: tokens.radius.control, paddingHorizontal: tokens.space.md, alignItems: 'center', justifyContent: 'center' },
  button_primary: { backgroundColor: COLORS.accent },
  button_secondary: { backgroundColor: COLORS.surface, borderColor: COLORS.border, borderWidth: 1 },
  button_danger: { backgroundColor: COLORS.dangerSoft, borderColor: COLORS.danger, borderWidth: 1 },
  button_plain: { backgroundColor: 'transparent' },
  buttonText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  buttonText_primary: { color: COLORS.inverse },
  buttonText_secondary: { color: COLORS.text },
  buttonText_danger: { color: COLORS.danger },
  buttonText_plain: { color: COLORS.accent },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  fieldWrap: { gap: 6 },
  label: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  input: { minHeight: tokens.hitTarget, borderRadius: tokens.radius.control, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.text, paddingHorizontal: tokens.space.sm, fontSize: tokens.type.body },
  multiline: { minHeight: 96, paddingTop: 12, textAlignVertical: 'top' },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  choiceSelected: { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent },
  choiceText: { color: COLORS.text, fontSize: 14 },
  choiceTextSelected: { color: COLORS.accent, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: COLORS.background, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetFull: { height: '100%', maxHeight: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  sheetHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: tokens.space.xs, paddingHorizontal: tokens.space.md, borderBottomColor: COLORS.border, borderBottomWidth: 1 },
  sheetTitle: { flex: 1, color: COLORS.text, fontSize: 20, fontWeight: '800' },
  sheetContent: { padding: tokens.space.md, paddingBottom: tokens.space.xl, gap: tokens.space.sm },
  sheetFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: tokens.space.xs, padding: tokens.space.md, borderTopColor: COLORS.border, borderTopWidth: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, backgroundColor: COLORS.warningSoft, borderRadius: 10, paddingLeft: 12 },
  bannerText: { flex: 1, color: COLORS.warning, fontSize: 14, lineHeight: 20 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: COLORS.background },
});
