import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  Card,
  Field,
  Heading,
  LoadingView,
  Screen,
  Section,
  Sheet,
  StatusBanner,
  textStyles,
} from '@/components/ui';
import { useApp } from '@/context/app-context';
import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';
import type { Profile } from '@/types/domain';

export default function ProfilesRoute() {
  const app = useApp();
  const [createVisible, setCreateVisible] = useState(false);
  const [name, setName] = useState('');
  if (app.loading) return <LoadingView />;

  const activeProfile = app.snapshot.profiles.find(
    (profile) => profile.id === app.snapshot.activeProfileId && !profile.deletedAt,
  );
  const activeProfiles = app.snapshot.profiles.filter((profile) => !profile.deletedAt);
  const deletedProfiles = app.snapshot.profiles.filter((profile) => profile.deletedAt);

  async function createProfile() {
    await app.createProfile(name);
    setName('');
    setCreateVisible(false);
  }

  function confirmSwitch(profile: Profile) {
    Alert.alert(
      `${profile.name}(으)로 변경`,
      '오늘·기록·계정·항목·프로젝트·주간 분배가 선택한 프로필 기준으로 바뀝니다. 실행 중인 타이머가 있으면 먼저 일시정지합니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '프로필 변경',
          onPress: () => void app.switchProfile(profile.id).catch(() => undefined),
        },
      ],
    );
  }

  function confirmDelete(profile: Profile) {
    Alert.alert(
      `${profile.name} 삭제`,
      '프로필 목록에서 숨깁니다. 연결된 계정·항목·기록은 삭제하지 않으며 아래의 삭제된 프로필에서 복구할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => void app.deleteProfile(profile.id).catch(() => undefined),
        },
      ],
    );
  }

  return (
    <>
      <Screen>
        <Heading subtitle="계정과 항목을 서로 섞지 않고 프로필별로 사용합니다.">프로필</Heading>
        {app.error ? <StatusBanner message={app.error} onClose={app.clearError} /> : null}

        <Section title="현재 프로필">
          <Card>
            <Text style={textStyles.title}>{activeProfile?.name ?? '프로필 없음'}</Text>
            <Text style={textStyles.muted}>
              계정 {app.snapshot.accounts.filter((account) => !account.deletedAt).length}개 · 항목 {app.snapshot.items.filter((item) => !item.deletedAt).length}개
            </Text>
          </Card>
        </Section>

        <Section
          title="프로필 선택"
          action={<AppButton label="+ 새 프로필" variant="plain" onPress={() => setCreateVisible(true)} />}>
          <View style={styles.list}>
            {activeProfiles.map((profile) => {
              const current = profile.id === app.snapshot.activeProfileId;
              return (
                <View key={profile.id} style={styles.row}>
                  <View style={styles.copy}>
                    <Text style={textStyles.title}>{profile.name}</Text>
                    <Text style={textStyles.muted}>{current ? '현재 사용 중' : '저장된 프로필'}</Text>
                  </View>
                  {current ? (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>사용 중</Text>
                    </View>
                  ) : (
                    <View style={styles.actions}>
                      <AppButton label="변경" variant="secondary" onPress={() => confirmSwitch(profile)} />
                      <AppButton label="삭제" variant="danger" onPress={() => confirmDelete(profile)} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Section>

        {deletedProfiles.length > 0 ? (
          <Section title="삭제된 프로필">
            <View style={styles.list}>
              {deletedProfiles.map((profile) => (
                <View key={profile.id} style={styles.row}>
                  <View style={styles.copy}>
                    <Text style={textStyles.title}>{profile.name}</Text>
                    <Text style={textStyles.muted}>계정·항목·기록은 보존되어 있습니다.</Text>
                  </View>
                  <AppButton
                    label="복구"
                    variant="secondary"
                    onPress={() => void app.restoreProfile(profile.id).catch(() => undefined)}
                    disabled={app.busy}
                  />
                </View>
              ))}
            </View>
          </Section>
        ) : null}

        <Text style={textStyles.muted}>
          프로필 구분은 현재 기기에 저장됩니다. 기존 동기화는 계정·항목·기록을 백업하지만 프로필 소속 자체는 아직 다른 기기로 보내지 않습니다.
        </Text>
      </Screen>

      <Sheet visible={createVisible} title="새 프로필" onClose={() => setCreateVisible(false)}>
        <Field label="프로필 이름" value={name} onChangeText={setName} placeholder="예: 업무용 프로필" />
        <AppButton
          label="프로필 추가"
          onPress={() => void createProfile().catch(() => undefined)}
          disabled={!name.trim() || app.busy}
        />
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    overflow: 'hidden',
    borderRadius: tokens.radius.card,
    backgroundColor: COLORS.surfaceRaised,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: tokens.space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    paddingHorizontal: tokens.space.sm,
    paddingVertical: tokens.space.xs,
  },
  copy: { flexGrow: 1, flexShrink: 1, minWidth: 160, gap: 3 },
  actions: { flexGrow: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 4 },
  currentBadge: {
    minHeight: 32,
    justifyContent: 'center',
    borderRadius: tokens.radius.pill,
    backgroundColor: COLORS.accentSoft,
    paddingHorizontal: tokens.space.sm,
  },
  currentBadgeText: { color: COLORS.accent, fontSize: 13, fontWeight: '700' },
});
