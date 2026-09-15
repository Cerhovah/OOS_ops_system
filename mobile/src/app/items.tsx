import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Heading, LoadingView, Screen, StatusBanner } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { isItemDraftValid, itemDraftFrom, itemInputFromDraft, type ItemDraft } from '@/features/settings/drafts';
import { ItemEditorSheet } from '@/features/settings/item-editor-sheet';
import { ItemManagementSection } from '@/features/settings/management-sections';
import type { Item } from '@/types/domain';

export default function ItemsRoute() {
  const app = useApp();
  const params = useLocalSearchParams<{ itemId?: string | string[] }>();
  const routeItemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const handledRouteItem = useRef<string | null>(null);
  const accounts = useMemo(() => app.snapshot.accounts.filter((account) => !account.deletedAt), [app.snapshot.accounts]);
  const projects = useMemo(() => app.snapshot.projects.filter((project) => !project.deletedAt), [app.snapshot.projects]);
  const items = useMemo(() => app.snapshot.items.filter((item) => !item.deletedAt), [app.snapshot.items]);
  const [target, setTarget] = useState<Item | 'new' | null>(null);
  const [draft, setDraft] = useState<ItemDraft>(() => itemDraftFrom('new', '', null, undefined));

  const open = useCallback((item: Item | 'new') => {
    const schedule = item === 'new' ? null : app.snapshot.schedules.find((candidate) => candidate.itemId === item.id && !candidate.deletedAt) ?? null;
    const notification = item === 'new' ? undefined : app.snapshot.settings[`item_notification:${item.id}`];
    setTarget(item);
    setDraft(itemDraftFrom(item, accounts[0]?.id ?? '', schedule, notification));
  }, [accounts, app.snapshot.schedules, app.snapshot.settings]);

  useEffect(() => {
    if (app.loading || !routeItemId || handledRouteItem.current === routeItemId) return;
    const item = app.snapshot.items.find((candidate) => candidate.id === routeItemId && !candidate.deletedAt);
    if (!item) return;
    handledRouteItem.current = routeItemId;
    open(item);
  }, [app.loading, app.snapshot.items, open, routeItemId]);

  if (app.loading) return <LoadingView />;

  async function save() {
    if (!target || !isItemDraftValid(draft)) return;
    const id = await app.saveItem(itemInputFromDraft(target, draft));
    await app.setSetting(`item_notification:${id}`, draft.notificationEnabled);
    setTarget(null);
  }

  return (
    <>
      <Screen>
        <Heading subtitle="항목은 반드시 하나의 상위 계정에 연결됩니다.">항목 관리</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <ItemManagementSection items={items} accounts={accounts} onCreate={() => open('new')} onEdit={open} />
      </Screen>
      <ItemEditorSheet target={target} draft={draft} accounts={accounts} projects={projects}
        valid={isItemDraftValid(draft)} busy={app.busy}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        onSave={save} onDelete={app.deleteItem} onClose={() => setTarget(null)} />
    </>
  );
}
