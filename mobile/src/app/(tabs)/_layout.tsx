import { Tabs } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { accessibleTabBarBottomOffset, accessibleTabBarHeight } from '@/components/layout';
import { COLORS } from '@/theme/colors';

export default function TabsLayout() {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = accessibleTabBarHeight(fontScale);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.accentStrong,
        tabBarAllowFontScaling: true,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarLabelPosition: 'beside-icon',
        tabBarStyle: {
          position: 'absolute',
          marginHorizontal: 18,
          bottom: accessibleTabBarBottomOffset(insets.bottom),
          backgroundColor: COLORS.surfaceRaised,
          borderTopColor: COLORS.border,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: tabBarHeight / 2,
          height: tabBarHeight,
          padding: 4,
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
          elevation: 8,
        },
        tabBarItemStyle: {
          flex: 1,
          height: tabBarHeight - 8,
          marginHorizontal: 2,
        },
        tabBarButton: FloatingTabButton,
        tabBarIcon: ({ color }) => (
          <TabGlyph kind={route.name === 'index' ? 'today' : 'records'} color={color} />
        ),
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700', marginLeft: 7 },
      })}>
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarLabel: '오늘' }} />
      <Tabs.Screen name="records" options={{ title: '기록', tabBarLabel: '기록' }} />
    </Tabs>
  );
}

function FloatingTabButton({
  accessibilityLabel,
  accessibilityState,
  children,
  disabled,
  onLongPress,
  onPress,
  style,
  testID,
}: BottomTabBarButtonProps) {
  const selected = accessibilityState?.selected === true;
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      disabled={disabled}
      onLongPress={onLongPress}
      onPress={(event) => onPress?.(event)}
      testID={testID}
      style={({ pressed }) => [
        style,
        styles.tabButton,
        selected && styles.tabButtonSelected,
        pressed && styles.tabButtonPressed,
      ]}>
      {children}
    </Pressable>
  );
}

function TabGlyph({ kind, color }: { kind: 'today' | 'records'; color: ColorValue }) {
  if (kind === 'today') {
    return (
      <View style={[styles.todayGlyph, { borderColor: color }]}>
        <View style={[styles.todayGlyphDot, { backgroundColor: color }]} />
      </View>
    );
  }
  return (
    <View style={styles.recordsGlyph}>
      <View style={[styles.recordLine, { backgroundColor: color }]} />
      <View style={[styles.recordLine, styles.recordLineShort, { backgroundColor: color }]} />
      <View style={[styles.recordLine, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  todayGlyph: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayGlyphDot: { width: 5, height: 5, borderRadius: 3 },
  recordsGlyph: { width: 18, height: 18, justifyContent: 'center', gap: 3 },
  recordLine: { width: 18, height: 1.5, borderRadius: 1 },
  recordLineShort: { width: 12 },
  tabButton: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  tabButtonSelected: { backgroundColor: COLORS.accentSoft },
  tabButtonPressed: { opacity: 0.72 },
});
