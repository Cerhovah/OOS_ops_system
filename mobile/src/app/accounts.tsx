import { useState } from 'react';

import { Heading, LoadingView, Screen, StatusBanner } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { AccountEditorSheet } from '@/features/settings/account-editor-sheet';
import { AccountManagementSection } from '@/features/settings/management-sections';
import type { Account } from '@/types/domain';

export default function AccountsRoute() {
  const app = useApp();
  const [target, setTarget] = useState<Account | 'new' | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('');
  const [color, setColor] = useState('#607080');
  const accounts = app.snapshot.accounts.filter((account) => !account.deletedAt);
  if (app.loading) return <LoadingView />;

  function open(account: Account | 'new') {
    setTarget(account);
    setName(account === 'new' ? '' : account.name);
    setKind(account === 'new' ? '' : account.kind ?? '');
    setColor(account === 'new' ? '#607080' : account.color ?? '#607080');
  }

  async function save() {
    if (!name.trim()) return;
    await app.saveAccount({
      id: target === 'new' || target === null ? undefined : target.id,
      name: name.trim(),
      kind: kind.trim() || null,
      color: color.trim() || null,
    });
    setTarget(null);
  }

  return (
    <>
      <Screen>
        <Heading subtitle="계정은 항목을 묶는 상위 분류입니다.">계정 관리</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}
        <AccountManagementSection accounts={accounts} onCreate={() => open('new')} onEdit={open} />
      </Screen>
      <AccountEditorSheet target={target} name={name} kind={kind} color={color} busy={app.busy}
        onNameChange={setName} onKindChange={setKind} onColorChange={setColor} onSave={save}
        onDelete={app.deleteAccount} onClose={() => setTarget(null)} />
    </>
  );
}
