import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/ui';
import { DATABASE_NAME } from '@/constants/app';
import { AppProvider } from '@/context/app-context';
import { SyncProvider } from '@/context/sync-context';
import { migrateDatabase } from '@/data/migrations';
import { observeNotificationNavigation } from '@/services/notifications';
import { COLORS } from '@/theme/colors';

export { ErrorBoundary } from 'expo-router';

function Navigation() {
  useEffect(() => observeNotificationNavigation(), []);
  return (
    <Stack
      screenOptions={{
        headerBackTitle: '뒤로',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitle: '',
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: COLORS.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="more" options={{ title: '' }} />
      <Stack.Screen name="week" options={{ title: '지표' }} />
      <Stack.Screen name="projects" options={{ title: '프로젝트' }} />
      <Stack.Screen name="plan" options={{ title: '주간 시간 분배' }} />
      <Stack.Screen name="analysis" options={{ title: 'AI 분석' }} />
      <Stack.Screen name="time-notifications" options={{ title: '시간과 알림' }} />
      <Stack.Screen name="items" options={{ title: '항목 관리' }} />
      <Stack.Screen name="accounts" options={{ title: '계정 관리' }} />
      <Stack.Screen name="record-management" options={{ title: '기록 관리' }} />
      <Stack.Screen name="today/close" options={{ title: '오늘 종료', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: '설정' }} />
      <Stack.Screen name="auth/callback" options={{ title: '로그인 확인' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<LoadingView />}>
        <SQLiteProvider
          databaseName={DATABASE_NAME}
          onInit={migrateDatabase}
          useSuspense>
          <AppProvider>
            <SyncProvider>
              <Navigation />
            </SyncProvider>
          </AppProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}
