import { Alert } from 'react-native';

import { Heading, LoadingView, Screen, StatusBanner } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { AppInfoSection, ExportSection } from '@/features/settings/data-sections';
import { SyncSettingsSection } from '@/features/settings/sync-settings-section';

export default function SettingsScreen() {
  const app = useApp();
  if (app.loading) return <LoadingView />;

  function confirmReset() {
    Alert.alert('전체 초기화 1/2', '모든 로컬 기록과 변경 이력이 삭제되고 기본 데이터로 돌아갑니다. 로그인 상태이면 보존된 원격 백업이 다음 동기화 때 다시 내려올 수 있습니다. 먼저 내보내기를 권장합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '계속',
        onPress: () => Alert.alert('전체 초기화 2/2', '이 작업은 되돌릴 수 없습니다.', [
          { text: '취소', style: 'cancel' },
          { text: '전체 초기화', style: 'destructive', onPress: () => void app.resetAllData().catch(() => undefined) },
        ]),
      },
    ]);
  }

  return (
    <Screen>
      <Heading subtitle="동기화·내보내기·앱 초기화만 관리합니다.">설정</Heading>
      {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
      <SyncSettingsSection />
      <ExportSection />
      <AppInfoSection onReset={confirmReset} />
    </Screen>
  );
}
