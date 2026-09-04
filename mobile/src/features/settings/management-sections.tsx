import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Section, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import type { Account, Item } from '@/types/domain';

interface ItemManagementSectionProps {
  items: readonly Item[];
  accounts: readonly Account[];
  onCreate: () => void;
  onEdit: (item: Item) => void;
}

export function ItemManagementSection({ items, accounts, onCreate, onEdit }: ItemManagementSectionProps) {
  const app = useApp();
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));

  return (
    <Section title="항목 관리" action={<AppButton label="+ 항목" variant="plain" onPress={onCreate} />}>
      {items.map((item) => (
        <Card key={item.id}>
          <Text style={textStyles.title}>{item.name}</Text>
          <Text style={textStyles.muted}>{item.type} · {accountNames.get(item.accountId) ?? '삭제된 계정'}</Text>
          <View style={styles.actions}>
            <AppButton label="편집" variant="secondary" onPress={() => onEdit(item)} />
            <AppButton
              label={item.archived ? '보관 해제' : '보관'}
              variant="plain"
              onPress={() => void app.setItemArchived(item.id, !item.archived).catch(() => undefined)}
              disabled={app.busy}
            />
          </View>
        </Card>
      ))}
    </Section>
  );
}

interface AccountManagementSectionProps {
  accounts: readonly Account[];
  onCreate: () => void;
  onEdit: (account: Account) => void;
}

export function AccountManagementSection({ accounts, onCreate, onEdit }: AccountManagementSectionProps) {
  const app = useApp();

  return (
    <Section title="계정 관리" action={<AppButton label="+ 계정" variant="plain" onPress={onCreate} />}>
      {accounts.map((account) => (
        <Card key={account.id}>
          <Text style={textStyles.title}>{account.name}</Text>
          <Text style={textStyles.muted}>{account.kind ?? '분류 없음'} · {account.archived ? '보관됨' : '사용 중'}</Text>
          <View style={styles.actions}>
            <AppButton label="편집" variant="secondary" onPress={() => onEdit(account)} />
            <AppButton
              label={account.archived ? '보관 해제' : '보관'}
              variant="plain"
              onPress={() => void app.setAccountArchived(account.id, !account.archived).catch(() => undefined)}
              disabled={app.busy}
            />
          </View>
        </Card>
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
