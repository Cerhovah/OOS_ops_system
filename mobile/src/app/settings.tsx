import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  Card,
  ChoiceRow,
  Field,
  Heading,
  LoadingView,
  Screen,
  Section,
  Sheet,
  StatusBanner,
  textStyles,
  TimeField,
} from '@/components/ui';
import { useApp } from '@/context/app-context';
import { dateKey } from '@/domain/calculations';
import type { Account, Entry, Item, ItemInput, ItemType } from '@/types/domain';

const itemTypes = [
  { value: 'time', label: '시간' },
  { value: 'completion', label: '완료' },
  { value: 'count', label: '횟수' },
  { value: 'numeric', label: '수치' },
  { value: 'event', label: '이벤트' },
] as const;
const days = ['월', '화', '수', '목', '금', '토', '일'];
const exportTables = [
  'accounts', 'projects', 'items', 'item_schedules', 'project_kpis', 'project_kpi_records',
  'weekly_plans', 'weekly_plan_lines', 'entries', 'day_notes', 'day_closures',
  'weekly_comments', 'today_item_additions', 'settings',
];

function nullable(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

function amountOf(entry: Entry): number | null {
  return entry.durationMin ?? entry.value ?? entry.count;
}

export default function SettingsScreen() {
  const app = useApp();
  const params = useLocalSearchParams<{ itemId?: string | string[] }>();
  const routeItemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const handledRouteItem = useRef<string | null>(null);
  const activeAccounts = app.snapshot.accounts.filter((account) => !account.deletedAt);
  const activeProjects = app.snapshot.projects.filter((project) => !project.deletedAt);
  const activeItems = app.snapshot.items.filter((item) => !item.deletedAt);
  const [dayEnd, setDayEnd] = useState('23:00');
  const [notificationTime, setNotificationTime] = useState('21:30');
  const [notificationEnabled, setNotificationEnabled] = useState('1');
  const [notificationAlways, setNotificationAlways] = useState('0');
  const [timerNotifications, setTimerNotifications] = useState('0');
  const [itemForm, setItemForm] = useState<Item | 'new' | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState<ItemType>('time');
  const [accountId, setAccountId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [unit, setUnit] = useState('');
  const [levelMin, setLevelMin] = useState('');
  const [levelTarget, setLevelTarget] = useState('');
  const [levelMax, setLevelMax] = useState('');
  const [duration, setDuration] = useState('');
  const [countOnComplete, setCountOnComplete] = useState('0');
  const [weekdayMask, setWeekdayMask] = useState(0);
  const [plannedValue, setPlannedValue] = useState('');
  const [startTime, setStartTime] = useState('');
  const [itemNotificationEnabled, setItemNotificationEnabled] = useState('0');
  const [accountForm, setAccountForm] = useState<Account | 'new' | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountKind, setAccountKind] = useState('');
  const [accountColor, setAccountColor] = useState('#607080');
  const [entryForm, setEntryForm] = useState<Entry | null>(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNote, setEntryNote] = useState('');

  useEffect(() => {
    setDayEnd(app.snapshot.settings.day_end_time ?? '23:00');
    setNotificationTime(app.snapshot.settings.close_notification_time ?? '21:30');
    setNotificationEnabled(app.snapshot.settings.close_notification_enabled ?? '1');
    setNotificationAlways(app.snapshot.settings.notification_always ?? '0');
    setTimerNotifications(app.snapshot.settings.timer_limit_notifications_enabled ?? '0');
  }, [app.snapshot.settings]);

  useEffect(() => {
    if (app.loading || !routeItemId || handledRouteItem.current === routeItemId) return;
    const item = app.snapshot.items.find((candidate) => candidate.id === routeItemId && !candidate.deletedAt);
    if (!item) return;
    const schedule = app.snapshot.schedules.find((candidate) => candidate.itemId === item.id && !candidate.deletedAt);
    handledRouteItem.current = routeItemId;
    setItemForm(item);
    setItemName(item.name);
    setItemType(item.type);
    setAccountId(item.accountId);
    setProjectId(item.projectId ?? '');
    setUnit(item.unit ?? '');
    setLevelMin(item.levelMin?.toString() ?? '');
    setLevelTarget(item.levelTarget?.toString() ?? '');
    setLevelMax(item.levelMax?.toString() ?? '');
    setDuration(item.defaultDurationMin?.toString() ?? '');
    setCountOnComplete(item.countOnComplete ? '1' : '0');
    setWeekdayMask(schedule?.weekdayMask ?? 0);
    setPlannedValue(schedule?.plannedValue?.toString() ?? '');
    setStartTime(schedule?.startTime ?? '');
    setItemNotificationEnabled(app.snapshot.settings[`item_notification:${item.id}`] ?? '0');
  }, [app.loading, app.snapshot.items, app.snapshot.schedules, app.snapshot.settings, routeItemId]);

  if (app.loading) return <LoadingView />;

  function openItem(item: Item | 'new') {
    const schedule = item === 'new' ? null : app.snapshot.schedules.find((candidate) => candidate.itemId === item.id && !candidate.deletedAt);
    setItemForm(item);
    setItemName(item === 'new' ? '' : item.name);
    setItemType(item === 'new' ? 'time' : item.type);
    setAccountId(item === 'new' ? (activeAccounts[0]?.id ?? '') : item.accountId);
    setProjectId(item === 'new' ? '' : item.projectId ?? '');
    setUnit(item === 'new' ? '' : item.unit ?? '');
    setLevelMin(item === 'new' ? '' : item.levelMin?.toString() ?? '');
    setLevelTarget(item === 'new' ? '' : item.levelTarget?.toString() ?? '');
    setLevelMax(item === 'new' ? '' : item.levelMax?.toString() ?? '');
    setDuration(item === 'new' ? '' : item.defaultDurationMin?.toString() ?? '');
    setCountOnComplete(item === 'new' || !item.countOnComplete ? '0' : '1');
    setWeekdayMask(schedule?.weekdayMask ?? 0);
    setPlannedValue(schedule?.plannedValue?.toString() ?? '');
    setStartTime(schedule?.startTime ?? '');
    setItemNotificationEnabled(
      item === 'new' ? '0' : (app.snapshot.settings[`item_notification:${item.id}`] ?? '0'),
    );
  }

  const itemNumbers = [levelMin, levelTarget, levelMax, duration, plannedValue]
    .filter((value) => value.trim() !== '')
    .map(Number);
  const itemValid = Boolean(itemName.trim() && accountId) && itemNumbers.every(Number.isFinite) && (startTime === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(startTime));

  async function saveItem() {
    if (!itemValid) return;
    const input: ItemInput = {
      id: itemForm === 'new' || itemForm === null ? undefined : itemForm.id,
      name: itemName.trim(),
      accountId,
      projectId: projectId || null,
      type: itemType,
      unit: unit.trim() || null,
      levelMin: nullable(levelMin),
      levelTarget: nullable(levelTarget),
      levelMax: nullable(levelMax),
      defaultDurationMin: nullable(duration),
      countOnComplete: countOnComplete === '1',
      weekdayMask,
      plannedValue: nullable(plannedValue),
      startTime: startTime || null,
      autoCreate: weekdayMask > 0,
    };
    const id = await app.saveItem(input);
    await app.setSetting(`item_notification:${id}`, itemNotificationEnabled);
    setItemForm(null);
  }

  function openAccount(account: Account | 'new') {
    setAccountForm(account);
    setAccountName(account === 'new' ? '' : account.name);
    setAccountKind(account === 'new' ? '' : account.kind ?? '');
    setAccountColor(account === 'new' ? '#607080' : account.color ?? '#607080');
  }

  async function saveAccount() {
    if (!accountName.trim()) return;
    await app.saveAccount({
      id: accountForm === 'new' || accountForm === null ? undefined : accountForm.id,
      name: accountName.trim(),
      kind: accountKind.trim() || null,
      color: accountColor.trim() || null,
    });
    setAccountForm(null);
  }

  async function saveSettings() {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(dayEnd) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(notificationTime)) {
      Alert.alert('입력 확인', '시각은 HH:MM 형식으로 입력하십시오.');
      return;
    }
    await app.setSetting('week_start_day', '0');
    await app.setSetting('day_end_time', dayEnd);
    await app.setSetting('close_notification_time', notificationTime);
    await app.setSetting('close_notification_enabled', notificationEnabled);
    await app.setSetting('notification_always', notificationAlways);
    await app.setSetting('timer_limit_notifications_enabled', timerNotifications);
    Alert.alert('설정 저장', '로컬 설정과 알림 예약을 갱신했습니다.');
  }

  async function updateEntry() {
    if (!entryForm) return;
    const value = entryForm.type === 'event' && entryValue.trim() === '' ? null : Number(entryValue);
    if (value !== null && !Number.isFinite(value)) return;
    await app.updateEntry(entryForm.id, value, entryNote.trim() || null);
    setEntryForm(null);
  }

  function confirmReset() {
    Alert.alert('전체 초기화 1/2', '모든 로컬 기록과 변경 이력이 삭제되고 §4.4 시드로 돌아갑니다. 먼저 내보내기를 권장합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '계속',
        onPress: () =>
          Alert.alert('전체 초기화 2/2', '이 작업은 되돌릴 수 없습니다.', [
            { text: '취소', style: 'cancel' },
            { text: '전체 초기화', style: 'destructive', onPress: () => void app.resetAllData() },
          ]),
      },
    ]);
  }

  const deletedEntries = app.snapshot.entries.filter((entry) => entry.deletedAt);
  const deletedItems = app.snapshot.items.filter((item) => item.deletedAt);
  const deletedAccounts = app.snapshot.accounts.filter((account) => account.deletedAt);
  const deletedProjects = app.snapshot.projects.filter((project) => project.deletedAt);
  const deletedKpis = app.snapshot.kpis.filter((kpi) => kpi.deletedAt);
  const recentEntries = app.snapshot.entries.filter((entry) => !entry.deletedAt && !entry.startedAt).slice(0, 30);

  return (
    <>
      <Screen>
        <Heading subtitle="모든 설정은 기기 로컬에 저장됩니다.">설정</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <Section title="시간과 알림">
          <Card>
            <Text style={textStyles.body}>주 시작 요일: 월요일</Text>
            <TimeField label="하루 종료 시각" value={dayEnd} onChange={setDayEnd} />
            <TimeField label="오늘 종료 알림" value={notificationTime} onChange={setNotificationTime} />
            <ChoiceRow
              label="오늘 종료 알림 사용"
              choices={[{ value: '1', label: '사용' }, { value: '0', label: '사용 안 함' }]}
              value={notificationEnabled}
              onChange={setNotificationEnabled}
            />
            <ChoiceRow
              label="타이머 상한 도달 알림"
              choices={[{ value: '0', label: '사용 안 함' }, { value: '1', label: '사용' }]}
              value={timerNotifications}
              onChange={setTimerNotifications}
            />
            <ChoiceRow
              label="오늘 종료 후에도 알림"
              choices={[{ value: '0', label: '그날은 건너뜀' }, { value: '1', label: '항상 받기' }]}
              value={notificationAlways}
              onChange={setNotificationAlways}
            />
            <AppButton label="설정 저장" onPress={() => void saveSettings()} />
            <AppButton
              label="알림 권한 다시 요청"
              variant="secondary"
              onPress={() => void app.requestNotifications().then((granted) => Alert.alert('알림 권한', granted ? '허용됨' : '허용되지 않음'))}
            />
            <AppButton
              label="30초 뒤 테스트 알림"
              variant="secondary"
              onPress={() => void app.testNotification()
                .then(() => Alert.alert('알림 테스트', '30초 뒤 일회성 알림을 예약했습니다. 반복 알림 설정은 변경하지 않습니다.'))
                .catch(() => undefined)}
            />
          </Card>
        </Section>

        <Section title="항목 관리" action={<AppButton label="+ 항목" variant="plain" onPress={() => openItem('new')} />}>
          {activeItems.map((item) => (
            <Card key={item.id}>
              <Text style={textStyles.title}>{item.name}</Text>
              <Text style={textStyles.muted}>{item.type} · {activeAccounts.find((account) => account.id === item.accountId)?.name ?? '삭제된 계정'}</Text>
              <View style={styles.actions}>
                <AppButton label="편집" variant="secondary" onPress={() => openItem(item)} />
                <AppButton label={item.archived ? '보관 해제' : '보관'} variant="plain" onPress={() => void app.setItemArchived(item.id, !item.archived)} />
              </View>
            </Card>
          ))}
        </Section>

        <Section title="계정 관리" action={<AppButton label="+ 계정" variant="plain" onPress={() => openAccount('new')} />}>
          {activeAccounts.map((account) => (
            <Card key={account.id}>
              <Text style={textStyles.title}>{account.name}</Text>
              <Text style={textStyles.muted}>{account.kind ?? '분류 없음'} · {account.archived ? '보관됨' : '사용 중'}</Text>
              <View style={styles.actions}>
                <AppButton label="편집" variant="secondary" onPress={() => openAccount(account)} />
                <AppButton label={account.archived ? '보관 해제' : '보관'} variant="plain" onPress={() => void app.setAccountArchived(account.id, !account.archived)} />
              </View>
            </Card>
          ))}
        </Section>

        <Section title="최근 기록 수정·삭제">
          {recentEntries.map((entry) => {
            const item = app.snapshot.items.find((candidate) => candidate.id === entry.itemId);
            return (
              <Card key={entry.id}>
                <Text style={textStyles.title}>{item?.name ?? '삭제된 항목'}</Text>
                <Text style={textStyles.body}>{entry.type} · {amountOf(entry) ?? '—'} · {dateKey(new Date(entry.occurredAt))}</Text>
                <View style={styles.actions}>
                  <AppButton
                    label="수정"
                    variant="secondary"
                    onPress={() => {
                      setEntryForm(entry);
                      setEntryValue(amountOf(entry)?.toString() ?? '');
                      setEntryNote(entry.note ?? '');
                    }}
                  />
                  <AppButton label="삭제" variant="danger" onPress={() => void app.deleteEntry(entry.id)} />
                </View>
              </Card>
            );
          })}
        </Section>

        <Section title="삭제된 데이터 복구">
          {deletedEntries.map((entry) => (
            <Card key={entry.id}>
              <Text style={textStyles.body}>기록 · {app.snapshot.items.find((item) => item.id === entry.itemId)?.name ?? entry.itemId} · {amountOf(entry) ?? '—'}</Text>
              <AppButton label="기록 복구" variant="secondary" onPress={() => void app.restoreEntry(entry.id)} />
            </Card>
          ))}
          {deletedItems.map((item) => (
            <Card key={item.id}><Text style={textStyles.body}>항목 · {item.name}</Text><AppButton label="항목 복구" variant="secondary" onPress={() => void app.restoreItem(item.id)} /></Card>
          ))}
          {deletedAccounts.map((account) => (
            <Card key={account.id}><Text style={textStyles.body}>계정 · {account.name}</Text><AppButton label="계정 복구" variant="secondary" onPress={() => void app.restoreAccount(account.id)} /></Card>
          ))}
          {deletedProjects.map((project) => (
            <Card key={project.id}><Text style={textStyles.body}>프로젝트 · {project.name}</Text><AppButton label="프로젝트 복구" variant="secondary" onPress={() => void app.restoreProject(project.id)} /></Card>
          ))}
          {deletedKpis.map((kpi) => (
            <Card key={kpi.id}><Text style={textStyles.body}>KPI · {kpi.label}</Text><AppButton label="KPI 복구" variant="secondary" onPress={() => void app.restoreKpi(kpi.id)} /></Card>
          ))}
          {deletedEntries.length + deletedItems.length + deletedAccounts.length + deletedProjects.length + deletedKpis.length === 0 ? (
            <Text style={textStyles.body}>삭제된 데이터가 없습니다.</Text>
          ) : null}
        </Section>

        <Section title="데이터 내보내기">
          <AppButton label="전체 JSON 내보내기" onPress={() => void app.exportJson()} />
          <Text style={textStyles.muted}>CSV는 테이블별로 공유합니다. 소프트 삭제 행과 계획 전 버전을 포함합니다.</Text>
          <View style={styles.actions}>
            {exportTables.map((table) => (
              <AppButton key={table} label={`${table}.csv`} variant="secondary" onPress={() => void app.exportCsv(table)} />
            ))}
          </View>
        </Section>

        <Section title="앱 정보와 초기화">
          <Card>
            <Text style={textStyles.body}>OOS Ops · Phase 1 · 로컬 우선</Text>
            <Text style={textStyles.muted}>Supabase, Telegram, AI API는 현재 비활성화되어 있습니다.</Text>
            <AppButton label="전체 초기화" variant="danger" onPress={confirmReset} />
          </Card>
        </Section>
      </Screen>

      <Sheet visible={itemForm !== null} title={itemForm === 'new' ? '항목 추가' : '항목 편집'} onClose={() => setItemForm(null)}>
        <Field label="항목 이름" value={itemName} onChangeText={setItemName} />
        <ChoiceRow label="유형" choices={itemTypes} value={itemType} onChange={(value) => setItemType(value as ItemType)} />
        <ChoiceRow
          label="시간계정"
          choices={activeAccounts.filter((account) => !account.archived).map((account) => ({ value: account.id, label: account.name }))}
          value={accountId}
          onChange={setAccountId}
        />
        <ChoiceRow
          label="프로젝트(선택)"
          choices={[{ value: '', label: '연결 안 함' }, ...activeProjects.map((project) => ({ value: project.id, label: project.name }))]}
          value={projectId}
          onChange={setProjectId}
        />
        <Field label="단위(선택)" value={unit} onChangeText={setUnit} />
        <Field label="최소(선택)" value={levelMin} onChangeText={setLevelMin} keyboardType="decimal-pad" />
        <Field label="목표(선택)" value={levelTarget} onChangeText={setLevelTarget} keyboardType="decimal-pad" />
        <Field label="상한(선택)" value={levelMax} onChangeText={setLevelMax} keyboardType="decimal-pad" />
        <Field label="수동 입력 기본 분(선택)" value={duration} onChangeText={setDuration} keyboardType="number-pad" />
        {itemType === 'time' ? (
          <ChoiceRow
            label="완료 시 횟수 증가"
            choices={[{ value: '0', label: '사용 안 함' }, { value: '1', label: '1회 증가' }]}
            value={countOnComplete}
            onChange={setCountOnComplete}
          />
        ) : null}
        <Text style={textStyles.title}>요일 템플릿(선택)</Text>
        <View style={styles.actions}>
          {days.map((day, index) => (
            <AppButton
              key={day}
              label={day}
              variant={(weekdayMask & (1 << index)) !== 0 ? 'primary' : 'secondary'}
              onPress={() => setWeekdayMask((mask) => mask ^ (1 << index))}
            />
          ))}
        </View>
        <Field label="요일 계획값(선택)" value={plannedValue} onChangeText={setPlannedValue} keyboardType="decimal-pad" />
        <Field label="알림 시작 시각(선택, HH:MM)" value={startTime} onChangeText={setStartTime} />
        <ChoiceRow
          label="이 항목 일정 알림"
          choices={[{ value: '0', label: '사용 안 함' }, { value: '1', label: '사용' }]}
          value={itemNotificationEnabled}
          onChange={setItemNotificationEnabled}
        />
        {!itemValid ? <StatusBanner message="필수값과 숫자·시각 형식을 확인하십시오." /> : null}
        <AppButton label="항목 저장" onPress={() => void saveItem()} disabled={!itemValid || app.busy} />
        {itemForm !== 'new' && itemForm ? (
          <AppButton
            label="항목 삭제"
            variant="danger"
            onPress={() => {
              const item = itemForm;
              Alert.alert('항목 삭제', '소프트 삭제하며 이 화면에서 복구할 수 있습니다.', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => void app.deleteItem(item.id).then(() => setItemForm(null)) },
              ]);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={accountForm !== null} title={accountForm === 'new' ? '계정 추가' : '계정 편집'} onClose={() => setAccountForm(null)}>
        <Field label="계정 이름" value={accountName} onChangeText={setAccountName} />
        <Field label="분류(선택)" value={accountKind} onChangeText={setAccountKind} />
        <Field label="색상(선택)" value={accountColor} onChangeText={setAccountColor} />
        <AppButton label="계정 저장" onPress={() => void saveAccount()} disabled={!accountName.trim()} />
        {accountForm !== 'new' && accountForm ? (
          <AppButton
            label="계정 삭제"
            variant="danger"
            onPress={() => {
              const account = accountForm;
              Alert.alert('계정 삭제', '계정은 소프트 삭제되며 연결 기록은 보존됩니다.', [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => void app.deleteAccount(account.id).then(() => setAccountForm(null)) },
              ]);
            }}
          />
        ) : null}
      </Sheet>

      <Sheet visible={entryForm !== null} title="기록 수정" onClose={() => setEntryForm(null)}>
        <Field label="값" value={entryValue} onChangeText={setEntryValue} keyboardType="decimal-pad" />
        <Field label="메모" value={entryNote} onChangeText={setEntryNote} multiline />
        <AppButton
          label="수정 저장"
          onPress={() => void updateEntry()}
          disabled={(entryForm?.type !== 'event' && entryValue.trim() === '') || (entryValue.trim() !== '' && !Number.isFinite(Number(entryValue)))}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
