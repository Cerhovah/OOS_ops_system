import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Text } from 'react-native';

import { AppButton, Card, Section, StatusBanner, textStyles } from '@/components/ui';
import { useSync } from '@/context/sync-context';
import { AnalysisRepository } from '@/data/analysis-repository';
import { publishLocalMutation } from '@/services/local-mutation-signal';
import type { AnalysisSession } from '@/types/domain';

const PAGE_SIZE = 50;

export function AnalysisRecoverySection() {
  const db = useSQLiteContext();
  const { lastSyncedAt } = useSync();
  const repository = useMemo(() => new AnalysisRepository(db), [db]);
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);

  const loadPage = useCallback(async (offset = 0) => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    try {
      const next = await repository.listDeletedSessions(PAGE_SIZE, offset);
      if (sequence !== requestSequence.current) return;
      setSessions((current) => offset === 0 ? next : [...current, ...next]);
      setHasMore(next.length === PAGE_SIZE);
      setError(null);
    } catch (caught) {
      if (sequence !== requestSequence.current) return;
      setError(caught instanceof Error ? caught.message : '삭제된 분석 세션을 불러오지 못했습니다.');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    void loadPage();
    return () => {
      requestSequence.current += 1;
    };
  }, [lastSyncedAt, loadPage]);

  const restore = useCallback(async (sessionId: string) => {
    setRestoringId(sessionId);
    setError(null);
    try {
      await repository.restoreSession(sessionId);
      publishLocalMutation();
      await loadPage();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '분석 세션을 복구하지 못했습니다.');
    } finally {
      setRestoringId(null);
    }
  }, [loadPage, repository]);

  return (
    <Section title="삭제된 분석 세션 복구">
      {error ? <StatusBanner message={error} onClose={() => setError(null)} /> : null}
      {loading ? <Text style={textStyles.muted}>삭제된 분석 세션을 확인하는 중입니다.</Text> : null}
      {!loading && sessions.length === 0 ? <Text style={textStyles.body}>삭제된 분석 세션이 없습니다.</Text> : null}
      {sessions.map((session) => (
        <Card key={session.id}>
          <Text style={textStyles.title}>{session.question?.trim() || '질문 없이 실행한 분석'}</Text>
          <Text style={textStyles.muted}>{session.createdAt.slice(0, 10)} · {session.mode}</Text>
          <AppButton
            label="분석 세션 복구"
            variant="secondary"
            disabled={restoringId !== null}
            onPress={() => void restore(session.id)}
          />
        </Card>
      ))}
      {hasMore ? (
        <AppButton
          label="삭제된 분석 더 보기"
          variant="secondary"
          disabled={loading || restoringId !== null}
          onPress={() => void loadPage(sessions.length)}
        />
      ) : null}
    </Section>
  );
}
