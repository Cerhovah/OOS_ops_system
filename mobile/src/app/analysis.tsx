import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';

import { buildAnalysisSnapshot, estimateSnapshotTokens, serializeAnalysisSnapshot } from '@/analysis/packager';
import { ANALYSIS_MODE_QUESTIONS } from '@/analysis/prompt';
import { resolveAnalysisTransport } from '@/analysis/provider-registry';
import { runAnalysis } from '@/analysis/service';
import { Heading, Screen, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { COLORS } from '@/theme/colors';
import { useApp } from '@/context/app-context';
import { useSync } from '@/context/sync-context';
import { AnalysisRepository } from '@/data/analysis-repository';
import { dateKey, parseWeekStartDay, weekRange } from '@/domain/calculations';
import {
  ANALYSIS_RANGE_CHOICES,
  AnalysisComposer,
  AnalysisHistory,
} from '@/features/analysis/analysis-sections';
import { completedAnalysisRange } from '@/features/analysis/analysis-range';
import { publishLocalMutation } from '@/services/local-mutation-signal';
import type { AiProposal, AnalysisMode, AnalysisSession } from '@/types/domain';

export default function AnalysisRoute() {
  const db = useSQLiteContext();
  const repository = useMemo(() => new AnalysisRepository(db), [db]);
  const { snapshot, refresh, error, clearError } = useApp();
  const sync = useSync();
  const [mode, setMode] = useState<AnalysisMode>('audit');
  const [analysisTier, setAnalysisTier] = useState<'standard' | 'deep'>('standard');
  const [rangeWeeks, setRangeWeeks] = useState('4');
  const [question, setQuestion] = useState(ANALYSIS_MODE_QUESTIONS.audit);
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AnalysisSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const historyRequest = useRef(0);

  const includeNotes = snapshot.settings.analysis_include_notes !== '0';
  const weekStartDay = parseWeekStartDay(snapshot.settings.week_start_day);
  const today = dateKey(new Date());
  const selectedWeeks = Number(rangeWeeks);
  const analysisRange = completedAnalysisRange(today, weekStartDay, selectedWeeks);
  const rangeStart = analysisRange.start;
  const rangeEnd = analysisRange.end;
  const configured = Boolean(sync.session);
  const preview = useMemo(
    () => buildAnalysisSnapshot(snapshot, [], [], {
      rangeStart,
      rangeEnd,
      generatedAt: new Date().toISOString(),
      weekStartDay,
      includeNotes: false,
    }),
    [rangeEnd, rangeStart, snapshot, weekStartDay],
  );

  const reloadHistory = useCallback(async () => {
    const request = ++historyRequest.current;
    const nextSessions = await repository.listSessions(search);
    if (request !== historyRequest.current) return;
    const nextProposals = await repository.listProposalsForSessions(
      nextSessions.map((session) => session.id),
    );
    if (request !== historyRequest.current) return;
    setSessions(nextSessions);
    setProposals(nextProposals);
  }, [repository, search]);

  const reloadHistorySafely = useCallback(() => {
    void reloadHistory().catch((caught: unknown) => {
      setMessage(caught instanceof Error ? caught.message : '분석 기록을 불러오지 못했습니다.');
    });
  }, [reloadHistory]);

  useEffect(() => {
    const preferredRange = snapshot.settings.analysis_range_weeks;
    if (preferredRange && ANALYSIS_RANGE_CHOICES.some((choice) => choice.value === preferredRange)) {
      setRangeWeeks(preferredRange);
    }
  }, [snapshot.settings.analysis_range_weeks]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      reloadHistorySafely();
    }, 250);
    return () => {
      clearTimeout(timeout);
      historyRequest.current += 1;
    };
  }, [reloadHistorySafely]);

  const changeMode = (value: string) => {
    const nextMode = value as AnalysisMode;
    setMode(nextMode);
    setQuestion(ANALYSIS_MODE_QUESTIONS[nextMode]);
  };

  const selectExample = (example: string) => {
    setQuestion(example);
    if (example.startsWith('최근 8주')) setRangeWeeks('8');
  };

  const execute = async () => {
    const effectiveQuestion = question.trim() || ANALYSIS_MODE_QUESTIONS[mode];
    if (!effectiveQuestion) {
      setMessage('자유질문 내용을 입력하십시오.');
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const commentRangeStart = weekRange(rangeStart, weekStartDay).start;
      const notes = await repository.listSourceNotes(commentRangeStart, rangeEnd);
      const dataSnapshot = buildAnalysisSnapshot(snapshot, notes.dayNotes, notes.weeklyComments, {
        rangeStart,
        rangeEnd,
        generatedAt: new Date().toISOString(),
        weekStartDay,
        includeNotes,
      });
      const dataSnapshotJson = serializeAnalysisSnapshot(dataSnapshot);
      const transport = resolveAnalysisTransport();
      const result = await runAnalysis({
        mode,
        question: effectiveQuestion,
        rangeStart,
        rangeEnd,
        dataSnapshotJson,
        analysisTier,
      }, transport);
      await repository.saveSession({
        mode,
        question: effectiveQuestion,
        rangeStart,
        rangeEnd,
        dataSnapshotJson,
        result,
      });
      publishLocalMutation();
      await reloadHistory();
      setMessage(result.warning ?? '분석 세션을 저장했습니다. 제안은 아직 데이터에 적용되지 않았습니다.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : '분석을 완료하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const applyProposal = (proposal: AiProposal) => {
    Alert.alert(
      '계획 변경안 적용',
      '적용을 누르면 새 주간 계획 버전을 만듭니다. 기존 계획 버전은 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '적용',
          onPress: () => {
            setBusy(true);
            void repository.applyPlanProposal(proposal.id)
              .then(async (version) => {
                publishLocalMutation();
                await Promise.all([refresh(), reloadHistory()]);
                setMessage(`주간 계획 버전 ${version}을 만들었습니다.`);
              })
              .catch((caught: unknown) => {
                setMessage(caught instanceof Error ? caught.message : '제안을 적용하지 못했습니다.');
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  const dismissProposal = async (proposal: AiProposal) => {
    setBusy(true);
    try {
      await repository.dismissProposal(proposal.id);
      publishLocalMutation();
      await reloadHistory();
      setMessage('제안을 무시했습니다. 계획 데이터는 변경되지 않았습니다.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : '제안을 무시하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const deleteSession = (session: AnalysisSession) => {
    Alert.alert(
      '분석 세션 삭제',
      '분석 답변과 실제 첨부 데이터가 목록에서 숨겨집니다. 설정에서 복구할 수 있습니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => {
            setBusy(true);
            void repository.deleteSession(session.id)
              .then(async () => {
                setSelectedSnapshot((current) => current?.id === session.id ? null : current);
                publishLocalMutation();
                await reloadHistory();
                setMessage('분석 세션을 삭제했습니다. 설정에서 복구할 수 있습니다.');
              })
              .catch((caught: unknown) => {
                setMessage(caught instanceof Error ? caught.message : '분석 세션을 삭제하지 못했습니다.');
              })
              .finally(() => setBusy(false));
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <Heading subtitle="AI는 저장된 숫자를 분석하며, 사용자가 적용하기 전에는 계획을 바꾸지 않습니다.">분석</Heading>
      {error ? <StatusBanner message={error} onClose={clearError} /> : null}
      {message ? <StatusBanner message={message} onClose={() => setMessage(null)} /> : null}

      <AnalysisComposer
        mode={mode}
        rangeWeeks={rangeWeeks}
        analysisTier={analysisTier}
        question={question}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        previewCounts={{
          accounts: preview.accounts.length,
          items: preview.items.length,
          daily: preview.daily.length,
          weekly: preview.weekly.length,
        }}
        estimatedTokens={estimateSnapshotTokens(preview)}
        includeNotes={includeNotes}
        configured={configured}
        busy={busy}
        onModeChange={changeMode}
        onRangeChange={setRangeWeeks}
        onTierChange={setAnalysisTier}
        onQuestionChange={setQuestion}
        onExample={selectExample}
        onExecute={() => void execute().catch((caught: unknown) => {
          setMessage(caught instanceof Error ? caught.message : '분석을 완료하지 못했습니다.');
        })}
        onOpenSettings={() => router.push('/settings')}
      />

      <AnalysisHistory
        sessions={sessions}
        proposals={proposals}
        accounts={snapshot.accounts}
        search={search}
        busy={busy}
        onSearchChange={setSearch}
        onReload={reloadHistorySafely}
        onShowSnapshot={setSelectedSnapshot}
        onDeleteSession={deleteSession}
        onApplyProposal={applyProposal}
        onDismissProposal={(proposal) => void dismissProposal(proposal).catch((caught: unknown) => {
          setMessage(caught instanceof Error ? caught.message : '제안을 무시하지 못했습니다.');
        })}
      />

      <Sheet visible={selectedSnapshot !== null} title="실제 첨부 데이터" onClose={() => setSelectedSnapshot(null)}>
        <Text style={textStyles.muted}>이 JSON이 해당 분석 요청에 첨부되어 저장되었습니다. API 키는 포함되지 않습니다.</Text>
        <Text selectable style={styles.code}>{selectedSnapshot?.dataSnapshotJson ?? ''}</Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  code: { color: COLORS.text, fontSize: 11, lineHeight: 16, fontFamily: 'monospace' },
});
