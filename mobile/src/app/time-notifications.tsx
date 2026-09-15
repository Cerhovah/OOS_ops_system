import { Heading, LoadingView, Screen, StatusBanner } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { GeneralSettingsSection } from '@/features/settings/general-settings-section';

export default function TimeNotificationsRoute() {
  const app = useApp();
  if (app.loading) return <LoadingView />;
  return (
    <Screen>
      <Heading subtitle="주간 기준, 하루 종료와 기기 알림을 관리합니다.">시간과 알림</Heading>
      {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
      <GeneralSettingsSection />
    </Screen>
  );
}
