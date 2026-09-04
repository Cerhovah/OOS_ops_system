import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, Field, Section, StatusBanner, textStyles } from '@/components/ui';
import { useSync } from '@/context/sync-context';

export function SyncSettingsSection() {
  const sync = useSync();
  const [authEmail, setAuthEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);

  async function sendMagicLink() {
    if (sendingMagicLink || !authEmail.trim() || !authEmail.includes('@')) return;
    setSendingMagicLink(true);
    try {
      await sync.requestMagicLink(authEmail);
      setMagicLinkSent(true);
      Alert.alert('로그인 링크 발송', '이메일의 로그인 링크를 이 기기에서 여십시오.');
    } catch {
      // SyncContext가 표시할 오류 문구를 보존한다.
    } finally {
      setSendingMagicLink(false);
    }
  }

  return (
    <Section title="동기화와 백업">
      {sync.error ? <StatusBanner message={sync.error} onClose={sync.clearError} /> : null}
      <Card>
        {!sync.configured ? (
          <>
            <Text style={textStyles.body}>Supabase 로컬 환경변수가 아직 연결되지 않았습니다.</Text>
            <Text style={textStyles.muted}>연결 전에도 모든 기록은 SQLite에 계속 저장됩니다.</Text>
          </>
        ) : sync.loading ? (
          <Text style={textStyles.body}>로그인 상태를 확인하는 중입니다.</Text>
        ) : sync.session ? (
          <>
            <Text style={textStyles.body}>로그인 · {sync.session.user.email ?? sync.session.user.id}</Text>
            <Text style={textStyles.muted}>
              마지막 동기화 · {sync.lastSyncedAt ? new Date(sync.lastSyncedAt).toLocaleString('ko-KR') : '아직 없음'}
            </Text>
            <Text style={textStyles.muted}>전송 대기 · {sync.pendingCount}건</Text>
            <View style={styles.actions}>
              <AppButton
                label={sync.syncing ? '동기화 중' : '지금 동기화'}
                onPress={() => void sync.syncNow().catch(() => undefined)}
                disabled={sync.syncing}
              />
              <AppButton
                label="로그아웃"
                variant="secondary"
                onPress={() => void sync.signOut().catch(() => undefined)}
                disabled={sync.loading || sync.syncing}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={textStyles.body}>이메일은 재설치 복구와 본인 데이터 RLS 구분에만 사용합니다.</Text>
            <Field
              label="이메일"
              value={authEmail}
              onChangeText={setAuthEmail}
              keyboardType="email-address"
              placeholder="name@example.com"
            />
            {magicLinkSent ? (
              <>
                <Text style={textStyles.muted}>이메일의 로그인 링크를 누르면 앱으로 돌아와 동기화를 시작합니다.</Text>
                <AppButton
                  label="로그인 링크 다시 보내기"
                  variant="secondary"
                  onPress={() => void sendMagicLink().catch(() => undefined)}
                  disabled={sendingMagicLink}
                />
              </>
            ) : (
              <AppButton
                label="로그인 링크 받기"
                onPress={() => void sendMagicLink().catch(() => undefined)}
                disabled={!authEmail.includes('@') || sendingMagicLink}
              />
            )}
          </>
        )}
      </Card>
      {sync.conflicts.length > 0 ? (
        <>
          <Text style={textStyles.muted}>최근 충돌 {sync.conflicts.length}건 · 적용된 최종쓰기 결과를 표시합니다.</Text>
          {sync.conflicts.slice(0, 10).map((conflict) => (
            <Card key={conflict.id}>
              <Text style={textStyles.body}>{conflict.tableName} · {conflict.recordId}</Text>
              <Text style={textStyles.muted}>
                적용 · {conflict.winner === 'local' ? '기기 값' : '서버 값'} · {new Date(conflict.createdAt).toLocaleString('ko-KR')}
              </Text>
            </Card>
          ))}
        </>
      ) : (
        <Text style={textStyles.muted}>기록된 동기화 충돌이 없습니다.</Text>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
