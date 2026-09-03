import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { buildAnalysisSnapshot, estimateSnapshotTokens } from '@/analysis/packager';
import { ANALYSIS_EXAMPLE_QUESTIONS, ANALYSIS_MODE_LABELS, ANALYSIS_MODE_QUESTIONS, parseAnalysisResponse } from '@/analysis/prompt';
import { resolveAnalysisTransport } from '@/analysis/provider-registry';
import { runAnalysis } from '@/analysis/service';
import { AppButton, Card, ChoiceRow, Field, Heading, Screen, Section, Sheet, StatusBanner, textStyles } from '@/components/ui';
import { COLORS } from '@/constants/app';
import { useApp } from '@/context/app-context';
import { useSync } from '@/context/sync-context';
import { AnalysisRepository } from '@/data/analysis-repository';
import { addDays, dateKey, parseWeekStartDay, weekRange } from '@/domain/calculations';
import type { AiProposal, AnalysisMode, AnalysisSession, PlanChangePayload } from '@/types/domain';

const MODE_CHOICES = (Object.keys(ANALYSIS_MODE_LABELS) as AnalysisMode[]).map((value) => ({
  value,
  label: ANALYSIS_MODE_LABELS[value],
}));

const RANGE_CHOICES = [4, 8, 12].map((weeks) => ({ value: String(weeks), label: `${weeks}주` }));

const PROPOSAL_STATUS_LABELS = {
  pending: '적용 대기',
  applied: '적용됨',
  dismissed: '무시됨',
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function proposalPayload(proposal: AiProposal): PlanChangePayload | null {
  try {
    const value: unknown = JSON.parse(proposal.payloadJson);
    if (!isRecord(value) || typeof value.weekStart !== 'string' || !isRecord(value.minutesByAccount)) return null;
    const minutesByAccount: Record<string, number> = {};
    for (const [accountId, minutes] of Object.entries(value.minutesByAccount)) {
      if (typeof minutes !== 'number' || !Number.isFinite(minutes)) return null;
      minutesByAccount[accountId] = minutes;
    }
    const note = value.note === null ? null : typeof value.note === 'string' ? value.note : null;
    return { weekStart: value.weekStart, minutesByAccount, note };
  } catch {
    return null;
  }
}

function usageText(session: AnalysisSession): string {
  const tokens = session.inputTokens === null && session.outputTokens === null
    ? '토큰 정보 없음'
    : `입력 ${session.inputTokens ?? 0} · 출력 ${session.outputTokens ?? 0} 토큰`;
  const cost = session.estimatedCostUsd === null ? '비용 정보 없음' : `예상 $${session.estimatedCostUsd.toFixed(6)}`;
  return `${tokens} · ${cost}`;
}

export default function AnalysisScreen() {
  const db = useSQLiteContext();
  const repository = useMemo(() => new AnalysisRepository(db), [db]);
  const { snapshot, refresh } = useApp();
  const sync = useSync();
  const [mode, setMode] = useState<AnalysisMode>('audit');
  const [rangeWeeks, setRangeWeeks] = useState('4');
  const [question, setQuestion] = useState(ANALYSIS_MODE_QUESTIONS.audit);
  const [search, setSearch] = useState('');
  const [sessions, setSessions] = useState<AnalysisSession[]>([]);
  const [proposals, setProposals] = useState<AiProposal[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<AnalysisSession | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const provider = snapshot.settings.ai_provider?.trim() ?? '';
  const model = snapshot.settings.ai_model?.trim() ?? '';
  const includeNotes = snapshot.settings.analysis_include_notes !== '0';
  const weekStartDay = parseWeekStartDay(snapshot.settings.week_start_day);
  const rangeEnd = dateKey(new Date());
  const selectedWeeks = Number(rangeWeeks);
  const rangeStart = addDays(rangeEnd, -(selectedWeeks * 7) + 1);
  const configured = Boolean(provider && model && sync.session);
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
    const [nextSessions, nextProposals] = await Promise.all([
      repository.listSessions(search),
      repository.listProposals(),
    ]);
    setSessions(nextSessions);
    setProposals(nextProposals);
  }, [repository, search]);

  useEffect(() => {
    const preferredRange = snapshot.settings.analysis_range_weeks;
    if (preferredRange && RANGE_CHOICES.some((choice) => choice.value === preferredRange)) {
      setRangeWeeks(preferredRange);
    }
  }, [snapshot.settings.analysis_range_weeks]);

  useEffect(() => {
    void reloadHistory().catch((caught: unknown) => {
      setMessage(caught instanceof Error ? caught.message : '분석 기록을 불러오지 못했습니다.');
    });
  }, [reloadHistory]);

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
      const resolved = await resolveAnalysisTransport(snapshot.settings);
      const result = await runAnalysis({
        mode,
        question: effectiveQuestion,
        rangeStart,
        rangeEnd,
        dataSnapshotJson: JSON.stringify(dataSnapshot),
      }, resolved.transport, resolved.price);
      await repository.saveSession({
        mode,
        question: effectiveQuestion,
        rangeStart,
        rangeEnd,
        dataSnapshotJson: JSON.stringify(dataSnapshot),
        result,
      });
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
      await reloadHistory();
      setMessage('제안을 무시했습니다. 계획 데이터는 변경되지 않았습니다.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : '제안을 무시하지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Heading subtitle="AI는 저장된 숫자를 분석하며, 사용자가 적용하기 전에는 계획을 바꾸지 않습니다.">분석</Heading>
      {message ? <StatusBanner message={message} onClose={() => setMessage(null)} /> : null}

      <Section title="새 분석">
        <Card>
          <ChoiceRow label="분석 모드" choices={MODE_CHOICES} value={mode} onChange={changeMode} />
          <ChoiceRow label="분석 기간" choices={RANGE_CHOICES} value={rangeWeeks} onChange={setRangeWeeks} />
          <Field
            label={mode === 'free' ? '자유질문' : '질문 · 필요하면 수정 가능'}
            value={question}
            onChangeText={setQuestion}
            multiline
            placeholder="저장된 데이터로 확인할 질문을 입력하십시오."
          />
          {mode === 'free' ? (
            <View style={styles.examples}>
              <Text style={textStyles.muted}>명세 예시 질문</Text>
              {ANALYSIS_EXAMPLE_QUESTIONS.map((example) => (
                <AppButton key={example} label={example} variant="secondary" onPress={() => selectExample(example)} />
              ))}
            </View>
          ) : null}
          <View style={styles.summary}>
            <Text style={textStyles.body}>{rangeStart}–{rangeEnd}</Text>
            <Text style={textStyles.muted}>
              시간계정 {preview.accounts.length} · 항목 {preview.items.length} · 기록일 {preview.daily.length} · 주간 집계 {preview.weekly.length}
            </Text>
            <Text style={textStyles.muted}>
              전송 예상량 약 {estimateSnapshotTokens(preview).toLocaleString()} 토큰 · 메모 {includeNotes ? '포함' : '제외'}
            </Text>
            <Text style={textStyles.muted}>실제 전송 JSON은 분석 세션에 그대로 저장되어 다시 확인할 수 있습니다.</Text>
          </View>
          {configured ? (
            <AppButton label={busy ? '분석 중…' : '분석 실행 · API 비용 발생'} disabled={busy} onPress={() => void execute()} />
          ) : (
            <>
              <Text style={textStyles.muted}>AI 분석 서버 사용에는 Supabase 로그인이 필요합니다.</Text>
              <AppButton label="로그인 설정 열기" variant="secondary" onPress={() => router.push('/settings')} />
            </>
          )}
        </Card>
      </Section>

      <Section title="저장된 분석">
        <Card>
          <Field label="질문·답변 검색" value={search} onChangeText={setSearch} placeholder="검색어" />
          <AppButton label="검색 결과 새로고침" variant="secondary" onPress={() => void reloadHistory()} />
        </Card>
        {sessions.length === 0 ? (
          <Card><Text style={textStyles.muted}>저장된 분석 세션이 없습니다.</Text></Card>
        ) : sessions.map((session) => {
          const sessionProposals = proposals.filter((proposal) => proposal.sessionId === session.id);
          const parsedResponse = parseAnalysisResponse(session.responseText ?? '');
          return (
            <Card key={session.id}>
              <View style={styles.rowBetween}>
                <Text style={textStyles.title}>{ANALYSIS_MODE_LABELS[session.mode]}</Text>
                <Text style={textStyles.muted}>{session.createdAt.slice(0, 10)}</Text>
              </View>
              <Text style={textStyles.muted}>{session.rangeStart}–{session.rangeEnd}</Text>
              {session.question ? <Text style={textStyles.body}>질문: {session.question}</Text> : null}
              <Text style={textStyles.body}>{parsedResponse.answer}</Text>
              {parsedResponse.numbersUsed.length > 0 ? (
                <View style={styles.numbers}>
                  <Text style={textStyles.muted}>응답에 사용된 숫자</Text>
                  {parsedResponse.numbersUsed.map((number, index) => (
                    <Text key={`${number.label}-${number.period}-${index}`} style={textStyles.number}>
                      {number.label}: {number.value.toLocaleString()}{number.unit ?? ''} · {number.period}
                    </Text>
                  ))}
                </View>
              ) : null}
              <Text style={textStyles.muted}>{session.provider ?? '제공자 없음'} · {session.model ?? '모델 없음'}</Text>
              <Text style={textStyles.muted}>{usageText(session)}</Text>
              <AppButton label="첨부 데이터 보기" variant="plain" onPress={() => setSelectedSnapshot(session)} />
              {sessionProposals.map((proposal) => {
                const payload = proposalPayload(proposal);
                return (
                  <View key={proposal.id} style={styles.proposal}>
                    <View style={styles.rowBetween}>
                      <Text style={textStyles.title}>주간 계획 변경안</Text>
                      <Text style={textStyles.muted}>{PROPOSAL_STATUS_LABELS[proposal.status]}</Text>
                    </View>
                    <Text style={textStyles.body}>{proposal.rationale}</Text>
                    {payload ? (
                      <>
                        <Text style={textStyles.muted}>대상 주: {payload.weekStart}</Text>
                        {Object.entries(payload.minutesByAccount).map(([accountId, minutes]) => {
                          const account = snapshot.accounts.find((candidate) => candidate.id === accountId);
                          return <Text key={accountId} style={textStyles.number}>{account?.name ?? accountId}: {minutes}분</Text>;
                        })}
                      </>
                    ) : <Text style={styles.errorText}>제안 데이터를 읽을 수 없습니다.</Text>}
                    {proposal.status === 'pending' ? (
                      <View style={styles.actions}>
                        <AppButton label="무시" variant="secondary" disabled={busy} onPress={() => void dismissProposal(proposal)} />
                        <AppButton label="계획에 적용" disabled={busy || !payload} onPress={() => applyProposal(proposal)} />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </Card>
          );
        })}
      </Section>

      <Sheet visible={selectedSnapshot !== null} title="실제 첨부 데이터" onClose={() => setSelectedSnapshot(null)}>
        <Text style={textStyles.muted}>이 JSON이 해당 분석 요청에 첨부되어 저장되었습니다. API 키는 포함되지 않습니다.</Text>
        <Text selectable style={styles.code}>{selectedSnapshot?.dataSnapshotJson ?? ''}</Text>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: { gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 10 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  proposal: { gap: 8, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 12 },
  examples: { gap: 8 },
  numbers: { gap: 4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8 },
  errorText: { color: COLORS.danger, fontSize: 13 },
  code: { color: COLORS.text, fontSize: 11, lineHeight: 16, fontFamily: 'monospace' },
});
