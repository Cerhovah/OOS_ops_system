import { router } from 'expo-router';

import { AppButton, Card, Heading, Screen } from '@/components/ui';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Heading subtitle="요청한 화면 경로가 현재 앱에 없습니다.">화면을 열 수 없습니다</Heading>
      <Card>
        <AppButton label="오늘 화면으로 이동" onPress={() => router.replace('/')} />
      </Card>
    </Screen>
  );
}
