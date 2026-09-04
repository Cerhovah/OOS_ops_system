import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';

import { Heading, LoadingView, Screen, StatusBanner } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { AccountEditorSheet } from '@/features/settings/account-editor-sheet';
import { AiSettingsSection } from '@/features/settings/ai-settings-section';
import {
  AppInfoSection,
  ExportSection,
  RecentEntriesSection,
  RecoverySection,
  entryAmount,
} from '@/features/settings/data-sections';
import {
  isItemDraftValid,
  itemDraftFrom,
  itemInputFromDraft,
  type ItemDraft,
} from '@/features/settings/drafts';
import { EntryEditorSheet } from '@/features/settings/entry-editor-sheet';
import { GeneralSettingsSection } from '@/features/settings/general-settings-section';
import { ItemEditorSheet } from '@/features/settings/item-editor-sheet';
import { AccountManagementSection, ItemManagementSection } from '@/features/settings/management-sections';
import { SyncSettingsSection } from '@/features/settings/sync-settings-section';
import type { Account, Entry, Item } from '@/types/domain';

export default function SettingsScreen() {
  const app = useApp();
  const params = useLocalSearchParams<{ itemId?: string | string[] }>();
  const routeItemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const handledRouteItem = useRef<string | null>(null);
  const activeAccounts = useMemo(
    () => app.snapshot.accounts.filter((account) => !account.deletedAt),
    [app.snapshot.accounts],
  );
  const activeProjects = useMemo(
    () => app.snapshot.projects.filter((project) => !project.deletedAt),
    [app.snapshot.projects],
  );
  const activeItems = useMemo(
    () => app.snapshot.items.filter((item) => !item.deletedAt),
    [app.snapshot.items],
  );

  const [itemForm, setItemForm] = useState<Item | 'new' | null>(null);
  const [itemDraft, setItemDraft] = useState<ItemDraft>(() => itemDraftFrom('new', '', null, undefined));
  const [accountForm, setAccountForm] = useState<Account | 'new' | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountKind, setAccountKind] = useState('');
  const [accountColor, setAccountColor] = useState('#607080');
  const [entryForm, setEntryForm] = useState<Entry | null>(null);
  const [entryValue, setEntryValue] = useState('');
  const [entryNote, setEntryNote] = useState('');

  const openItem = useCallback((item: Item | 'new') => {
    const schedule = item === 'new'
      ? null
      : app.snapshot.schedules.find((candidate) => candidate.itemId === item.id && !candidate.deletedAt) ?? null;
    const notificationSetting = item === 'new'
      ? undefined
      : app.snapshot.settings[`item_notification:${item.id}`];
    setItemForm(item);
    setItemDraft(itemDraftFrom(item, activeAccounts[0]?.id ?? '', schedule, notificationSetting));
  }, [activeAccounts, app.snapshot.schedules, app.snapshot.settings]);

  useEffect(() => {
    if (app.loading || !routeItemId || handledRouteItem.current === routeItemId) return;
    const item = app.snapshot.items.find((candidate) => candidate.id === routeItemId && !candidate.deletedAt);
    if (!item) return;
    handledRouteItem.current = routeItemId;
    openItem(item);
  }, [app.loading, app.snapshot.items, openItem, routeItemId]);

  if (app.loading) return <LoadingView />;

  const itemValid = isItemDraftValid(itemDraft);

  function updateItemDraft(patch: Partial<ItemDraft>) {
    setItemDraft((current) => ({ ...current, ...patch }));
  }

  async function saveItem() {
    if (!itemForm || !itemValid) return;
    const id = await app.saveItem(itemInputFromDraft(itemForm, itemDraft));
    await app.setSetting(`item_notification:${id}`, itemDraft.notificationEnabled);
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

  function openEntry(entry: Entry) {
    setEntryForm(entry);
    setEntryValue(entryAmount(entry)?.toString() ?? '');
    setEntryNote(entry.note ?? '');
  }

  async function updateEntry() {
    if (!entryForm) return;
    const value = entryForm.type === 'event' && entryValue.trim() === '' ? null : Number(entryValue);
    if (value !== null && !Number.isFinite(value)) return;
    await app.updateEntry(entryForm.id, value, entryNote.trim() || null);
    setEntryForm(null);
  }

  function confirmReset() {
    Alert.alert('전체 초기화 1/2', '모든 로컬 기록과 변경 이력이 삭제되고 §4.4 시드로 돌아갑니다. 로그인 상태이면 보존된 원격 백업이 다음 동기화 때 다시 내려올 수 있습니다. 먼저 내보내기를 권장합니다.', [
      { text: '취소', style: 'cancel' },
      {
        text: '계속',
        onPress: () =>
          Alert.alert('전체 초기화 2/2', '이 작업은 되돌릴 수 없습니다.', [
            { text: '취소', style: 'cancel' },
            { text: '전체 초기화', style: 'destructive', onPress: () => void app.resetAllData().catch(() => undefined) },
          ]),
      },
    ]);
  }

  return (
    <>
      <Screen>
        <Heading subtitle="기록은 기기에 먼저 저장되고 로그인 시 Supabase와 동기화됩니다.">설정</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <GeneralSettingsSection />
        <SyncSettingsSection />
        <AiSettingsSection />
        <ItemManagementSection
          items={activeItems}
          accounts={activeAccounts}
          onCreate={() => openItem('new')}
          onEdit={openItem}
        />
        <AccountManagementSection
          accounts={activeAccounts}
          onCreate={() => openAccount('new')}
          onEdit={openAccount}
        />
        <RecentEntriesSection onEdit={openEntry} />
        <RecoverySection />
        <ExportSection />
        <AppInfoSection onReset={confirmReset} />
      </Screen>

      <ItemEditorSheet
        target={itemForm}
        draft={itemDraft}
        accounts={activeAccounts}
        projects={activeProjects}
        valid={itemValid}
        busy={app.busy}
        onChange={updateItemDraft}
        onSave={saveItem}
        onDelete={app.deleteItem}
        onClose={() => setItemForm(null)}
      />
      <AccountEditorSheet
        target={accountForm}
        name={accountName}
        kind={accountKind}
        color={accountColor}
        busy={app.busy}
        onNameChange={setAccountName}
        onKindChange={setAccountKind}
        onColorChange={setAccountColor}
        onSave={saveAccount}
        onDelete={app.deleteAccount}
        onClose={() => setAccountForm(null)}
      />
      <EntryEditorSheet
        target={entryForm}
        value={entryValue}
        note={entryNote}
        busy={app.busy}
        onValueChange={setEntryValue}
        onNoteChange={setEntryNote}
        onSave={updateEntry}
        onClose={() => setEntryForm(null)}
      />
    </>
  );
}
