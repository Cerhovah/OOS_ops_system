import { router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';

import { AppButton, Card, Heading, LoadingView, Screen, StatusBanner, textStyles } from '@/components/ui';
import { useSync } from '@/context/sync-context';

export default function AuthCallbackScreen() {
  const sync = useSync();

  useEffect(() => {
    if (sync.session) router.replace('/settings');
  }, [sync.session]);

  if (sync.loading && !sync.error) return <LoadingView />;

  return (
    <Screen>
      <Heading subtitle="이메일 로그인 링크의 세션을 확인합니다.">로그인 확인</Heading>
      {sync.error ? <StatusBanner message={sync.error} onClose={sync.clearError} /> : null}
      <Card>
        <Text style={textStyles.body}>
          {sync.session ? '로그인이 완료되었습니다.' : '로그인 링크를 확인하지 못했습니다.'}
        </Text>
        <AppButton label="설정으로 이동" onPress={() => router.replace('/settings')} />
      </Card>
    </Screen>
  );
}
