import { Tabs } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarButtonProps } from 'expo-router/build/react-navigation/bottom-tabs/types';

import { accessibleTabBarHeight } from '@/components/layout';
import { COLORS } from '@/theme/colors';
import { FONTS } from '@/theme/typography';

export default function TabsLayout() {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = accessibleTabBarHeight(fontScale);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accentStrong,
        tabBarAllowFontScaling: true,
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          position: 'absolute',
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabBarHeight + insets.bottom,
          paddingTop: 0,
          paddingBottom: insets.bottom,
          shadowOpacity: 0,
          elevation: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          height: tabBarHeight,
        },
        tabBarButton: MinimalTabButton,
        tabBarLabelStyle: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18 },
      }}>
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarLabel: ({ color, focused }) => <TabLabel color={color} focused={focused}>오늘</TabLabel> }} />
      <Tabs.Screen name="records" options={{ title: '기록', tabBarLabel: ({ color, focused }) => <TabLabel color={color} focused={focused}>기록</TabLabel> }} />
    </Tabs>
  );
}

function MinimalTabButton({
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
      accessibilityRole="tab"
      accessibilityState={accessibilityState}
      disabled={disabled}
      onLongPress={onLongPress}
      onPress={(event) => onPress?.(event)}
      testID={testID}
      style={({ pressed }) => [
        style,
        styles.tabButton,
        pressed && styles.tabButtonPressed,
      ]}>
      <View style={styles.tabButtonContent}>
        {children}
        <View style={[styles.indicator, selected && styles.indicatorSelected]} />
      </View>
    </Pressable>
  );
}

function TabLabel({ children, color, focused }: { children: string; color: ColorValue; focused: boolean }) {
  return <Text style={[styles.tabLabel, { color }, focused && styles.tabLabelSelected]}>{children}</Text>;
}

const styles = StyleSheet.create({
  tabButton: { alignItems: 'center', justifyContent: 'center' },
  tabButtonContent: { minWidth: 64, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 5 },
  indicator: { width: 20, height: 2, borderRadius: 1, backgroundColor: 'transparent' },
  indicatorSelected: { backgroundColor: COLORS.accent },
  tabLabel: { fontFamily: FONTS.regular, fontSize: 13, lineHeight: 18 },
  tabLabelSelected: { fontFamily: FONTS.medium },
  tabButtonPressed: { opacity: 0.72 },
});
