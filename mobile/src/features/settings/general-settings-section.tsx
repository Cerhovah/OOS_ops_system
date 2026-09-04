import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { AppButton, Card, ChoiceRow, Section, TimeField } from '@/components/ui';
import { useApp } from '@/context/app-context';

import {
  DEFAULT_GENERAL_SETTINGS_DRAFT,
  createEditableDraft,
  generalSettingsDraftFrom,
  hydrateEditableDraft,
  markEditableDraftSaved,
  patchEditableDraft,
  type GeneralSettingsDraft,
} from './drafts';

const DAYS = ['월', '화', '수', '목', '금', '토', '일'] as const;
const WEEK_START_CHOICES = DAYS.map((label, index) => ({ value: String(index), label }));
const ENABLED_CHOICES = [{ value: '1', label: '사용' }, { value: '0', label: '사용 안 함' }] as const;
const TIMER_CHOICES = [{ value: '0', label: '사용 안 함' }, { value: '1', label: '사용' }] as const;
const ALWAYS_CHOICES = [{ value: '0', label: '그날은 건너뜀' }, { value: '1', label: '항상 받기' }] as const;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function GeneralSettingsSection() {
  const app = useApp();
  const [state, setState] = useState(() => createEditableDraft(DEFAULT_GENERAL_SETTINGS_DRAFT));
  const draft = state.value;

  useEffect(() => {
    setState((current) => hydrateEditableDraft(current, generalSettingsDraftFrom(app.snapshot.settings)));
  }, [app.snapshot.settings]);

  function update(patch: Partial<GeneralSettingsDraft>) {
    setState((current) => patchEditableDraft(current, patch));
  }

  async function save() {
    if (!TIME_PATTERN.test(draft.dayEnd) || !TIME_PATTERN.test(draft.notificationTime)) {
      Alert.alert('입력 확인', '시각은 HH:MM 형식으로 입력하십시오.');
      return;
    }
    const submitted = draft;
    await app.setSettings({
      week_start_day: submitted.weekStartDay,
      day_end_time: submitted.dayEnd,
      close_notification_time: submitted.notificationTime,
      close_notification_enabled: submitted.notificationEnabled,
      notification_always: submitted.notificationAlways,
      timer_limit_notifications_enabled: submitted.timerNotifications,
    });
    setState((current) => markEditableDraftSaved(current, submitted));
    Alert.alert('설정 저장', '로컬 설정과 알림 예약을 갱신했습니다.');
  }

  return (
    <Section title="시간과 알림">
      <Card>
        <ChoiceRow
          label="주 시작 요일"
          choices={WEEK_START_CHOICES}
          value={draft.weekStartDay}
          onChange={(weekStartDay) => update({ weekStartDay })}
        />
        <TimeField label="하루 종료 시각" value={draft.dayEnd} onChange={(dayEnd) => update({ dayEnd })} />
        <TimeField
          label="오늘 종료 알림"
          value={draft.notificationTime}
          onChange={(notificationTime) => update({ notificationTime })}
        />
        <ChoiceRow
          label="오늘 종료 알림 사용"
          choices={ENABLED_CHOICES}
          value={draft.notificationEnabled}
          onChange={(notificationEnabled) => update({ notificationEnabled: notificationEnabled === '1' ? '1' : '0' })}
        />
        <ChoiceRow
          label="타이머 상한 도달 알림"
          choices={TIMER_CHOICES}
          value={draft.timerNotifications}
          onChange={(timerNotifications) => update({ timerNotifications: timerNotifications === '1' ? '1' : '0' })}
        />
        <ChoiceRow
          label="오늘 종료 후에도 알림"
          choices={ALWAYS_CHOICES}
          value={draft.notificationAlways}
          onChange={(notificationAlways) => update({ notificationAlways: notificationAlways === '1' ? '1' : '0' })}
        />
        <AppButton label="설정 저장" onPress={() => void save().catch(() => undefined)} disabled={app.busy} />
        <AppButton
          label="알림 권한 다시 요청"
          variant="secondary"
          onPress={() => void app.requestNotifications()
            .then((granted) => Alert.alert('알림 권한', granted ? '허용됨' : '허용되지 않음'))
            .catch(() => undefined)}
          disabled={app.busy}
        />
        <AppButton
          label="30초 뒤 테스트 알림"
          variant="secondary"
          onPress={() => void app.testNotification()
            .then(() => Alert.alert('알림 테스트', '30초 뒤 일회성 알림을 예약했습니다. 반복 알림 설정은 변경하지 않습니다.'))
            .catch(() => undefined)}
          disabled={app.busy}
        />
      </Card>
    </Section>
  );
}
