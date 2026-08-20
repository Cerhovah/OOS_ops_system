import { Tabs, router } from 'expo-router';
import { Pressable, Text } from 'react-native';

import { COLORS } from '@/constants/app';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="설정 열기"
            onPress={() => router.push('/settings')}
            style={{ minHeight: 44, minWidth: 56, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.accent, fontWeight: '700' }}>설정</Text>
          </Pressable>
        ),
        tabBarActiveTintColor: COLORS.accent,
        tabBarInactiveTintColor: COLORS.muted,
        tabBarStyle: { minHeight: 64, paddingBottom: 8, paddingTop: 6 },
        tabBarIcon: () => null,
        tabBarLabelStyle: { fontSize: 13, fontWeight: '700' },
      }}>
      <Tabs.Screen name="index" options={{ title: '오늘', tabBarLabel: '오늘' }} />
      <Tabs.Screen name="week" options={{ title: '주간', tabBarLabel: '주간' }} />
      <Tabs.Screen name="projects" options={{ title: '프로젝트', tabBarLabel: '프로젝트' }} />
      <Tabs.Screen name="plan" options={{ title: '계획', tabBarLabel: '계획' }} />
      <Tabs.Screen name="analysis" options={{ title: '분석', tabBarLabel: '분석' }} />
    </Tabs>
  );
}
