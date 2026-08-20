import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { Suspense, useEffect } from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingView } from '@/components/ui';
import { DATABASE_NAME } from '@/constants/app';
import { AppProvider } from '@/context/app-context';
import { migrateDatabase } from '@/data/migrations';
import { observeNotificationNavigation } from '@/services/notifications';

export { ErrorBoundary } from 'expo-router';

function Navigation() {
  useEffect(() => observeNotificationNavigation(), []);
  return (
    <Stack screenOptions={{ headerBackTitle: '뒤로' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="today/close" options={{ title: '오늘 종료', presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ title: '설정' }} />
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
          onError={(error) => {
            throw error;
          }}
          useSuspense>
          <AppProvider>
            <Navigation />
          </AppProvider>
        </SQLiteProvider>
      </Suspense>
    </SafeAreaProvider>
  );
}

export function UnmatchedError() {
  return <Text>화면을 열 수 없습니다.</Text>;
}
