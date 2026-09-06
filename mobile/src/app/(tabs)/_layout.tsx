import { Tabs } from 'expo-router';
import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { accessibleTabBarHeight } from '@/components/layout';
import { COLORS } from '@/theme/colors';

export default function TabsLayout() {
  const { fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.accent,
        tabBarAllowFontScaling: true,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: accessibleTabBarHeight(fontScale, insets.bottom),
          paddingTop: 8,
        },
        tabBarIcon: () => null,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarLabel: '오늘' }} />
      <Tabs.Screen name="records" options={{ title: '기록', tabBarLabel: '기록' }} />
    </Tabs>
  );
}
