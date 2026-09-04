import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { tryParsePlanChangePayload } from '@/analysis/plan-proposal';
import {
  ANALYSIS_EXAMPLE_QUESTIONS,
  ANALYSIS_MODE_LABELS,
  isAnalysisProseAllowed,
  parseAnalysisResponse,
} from '@/analysis/prompt';
import {
  AppButton,
  Card,
  ChoiceRow,
  Field,
  Section,
  textStyles,
} from '@/components/ui';
import { COLORS } from '@/constants/app';
import type { Account, AiProposal, AnalysisMode, AnalysisSession } from '@/types/domain';

const MODE_CHOICES = (Object.keys(ANALYSIS_MODE_LABELS) as AnalysisMode[]).map((value) => ({
  value,
  label: ANALYSIS_MODE_LABELS[value],
}));

const ANALYSIS_TIER_CHOICES = [
  { value: 'standard', label: '기본 분석' },
  { value: 'deep', label: '정밀 분석' },
] as const;

export const ANALYSIS_RANGE_CHOICES = [4, 8, 12].map((weeks) => ({
  value: String(weeks),
  label: `완료된 ${weeks}주`,
}));

const PROPOSAL_STATUS_LABELS = {
  pending: '적용 대기',
  applied: '적용됨',
  dismissed: '무시됨',
} as const;

interface AnalysisComposerProps {
  mode: AnalysisMode;
  analysisTier: 'standard' | 'deep';
  rangeWeeks: string;
  question: string;
  rangeStart: string;
  rangeEnd: string;
  previewCounts: { accounts: number; items: number; daily: number; weekly: number };
  estimatedTokens: number;
  includeNotes: boolean;
  configured: boolean;
  busy: boolean;
  onModeChange: (value: string) => void;
  onTierChange: (value: 'standard' | 'deep') => void;
  onRangeChange: (value: string) => void;
  onQuestionChange: (value: string) => void;
  onExample: (value: string) => void;
  onExecute: () => void;
  onOpenSettings: () => void;
}

export function AnalysisComposer({
  mode,
  analysisTier,
  rangeWeeks,
  question,
  rangeStart,
  rangeEnd,
  previewCounts,
  estimatedTokens,
  includeNotes,
  configured,
  busy,
  onModeChange,
  onTierChange,
  onRangeChange,
  onQuestionChange,
  onExample,
  onExecute,
  onOpenSettings,
}: AnalysisComposerProps) {
  return (
    <Section title="새 분석">
      <Card>
        <ChoiceRow label="분석 모드" choices={MODE_CHOICES} value={mode} onChange={onModeChange} />
        <ChoiceRow label="분석 수준" choices={ANALYSIS_TIER_CHOICES} value={analysisTier} onChange={(value) => onTierChange(value as 'standard' | 'deep')} />
        <ChoiceRow label="분석 기간" choices={ANALYSIS_RANGE_CHOICES} value={rangeWeeks} onChange={onRangeChange} />
        <Field
          label={mode === 'free' ? '자유질문' : '질문 · 필요하면 수정 가능'}
          value={question}
          onChangeText={onQuestionChange}
          multiline
          placeholder="저장된 데이터로 확인할 질문을 입력하십시오."
        />
        {mode === 'free' ? (
          <View style={styles.examples}>
            <Text style={textStyles.muted}>명세 예시 질문</Text>
            {ANALYSIS_EXAMPLE_QUESTIONS.map((example) => (
              <AppButton key={example} label={example} variant="secondary" onPress={() => onExample(example)} />
            ))}
          </View>
        ) : null}
        <View style={styles.summary}>
          <Text style={textStyles.body}>{rangeStart}–{rangeEnd}</Text>
          <Text style={textStyles.muted}>
            시간계정 {previewCounts.accounts} · 항목 {previewCounts.items} · 기록일 {previewCounts.daily} · 주간 집계 {previewCounts.weekly}
          </Text>
          <Text style={textStyles.muted}>
            메모 본문 제외 예상량 약 {estimatedTokens.toLocaleString()} 토큰 · 실행 시 메모 {includeNotes ? '포함' : '제외'}
          </Text>
          <Text style={textStyles.muted}>실제 전송 JSON은 분석 세션에 그대로 저장되어 다시 확인할 수 있습니다.</Text>
        </View>
        {configured ? (
          <AppButton label={busy ? '분석 중…' : '분석 실행 · API 비용 발생'} disabled={busy} onPress={onExecute} />
        ) : (
          <>
            <Text style={textStyles.muted}>AI 분석 서버 사용에는 Supabase 로그인이 필요합니다.</Text>
            <AppButton label="로그인 설정 열기" variant="secondary" onPress={onOpenSettings} />
          </>
        )}
      </Card>
    </Section>
  );
}

function usageText(session: AnalysisSession): string {
  const tokens = session.inputTokens === null && session.outputTokens === null
    ? '토큰 정보 없음'
    : `입력 ${session.inputTokens ?? 0} · 출력 ${session.outputTokens ?? 0} 토큰`;
  const cost = session.estimatedCostUsd === null ? '비용 정보 없음' : `예상 $${session.estimatedCostUsd.toFixed(6)}`;
  return `${tokens} · ${cost}`;
}

interface AnalysisHistoryProps {
  sessions: readonly AnalysisSession[];
  proposals: readonly AiProposal[];
  accounts: readonly Account[];
  search: string;
  busy: boolean;
  onSearchChange: (value: string) => void;
  onReload: () => void;
  onShowSnapshot: (session: AnalysisSession) => void;
  onDeleteSession: (session: AnalysisSession) => void;
  onApplyProposal: (proposal: AiProposal) => void;
  onDismissProposal: (proposal: AiProposal) => void;
}

export function AnalysisHistory({
  sessions,
  proposals,
  accounts,
  search,
  busy,
  onSearchChange,
  onReload,
  onShowSnapshot,
  onDeleteSession,
  onApplyProposal,
  onDismissProposal,
}: AnalysisHistoryProps) {
  const proposalsBySession = useMemo(() => {
    const index = new Map<string, AiProposal[]>();
    for (const proposal of proposals) {
      if (proposal.deletedAt) continue;
      const current = index.get(proposal.sessionId) ?? [];
      current.push(proposal);
      index.set(proposal.sessionId, current);
    }
    return index;
  }, [proposals]);
  const accountNames = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts],
  );
  const visibleSessions = useMemo(
    () => sessions.filter((session) => !session.deletedAt),
    [sessions],
  );

  return (
    <Section title="저장된 분석">
      <Card>
        <Field label="질문·답변 검색" value={search} onChangeText={onSearchChange} placeholder="검색어" />
        <AppButton label="검색 결과 새로고침" variant="secondary" onPress={onReload} />
      </Card>
      {visibleSessions.length === 0 ? (
        <Card><Text style={textStyles.muted}>저장된 분석 세션이 없습니다.</Text></Card>
      ) : visibleSessions.map((session) => (
        <AnalysisSessionCard
          key={session.id}
          session={session}
          proposals={proposalsBySession.get(session.id) ?? []}
          accountNames={accountNames}
          busy={busy}
          onShowSnapshot={onShowSnapshot}
          onDeleteSession={onDeleteSession}
          onApplyProposal={onApplyProposal}
          onDismissProposal={onDismissProposal}
        />
      ))}
    </Section>
  );
}

interface AnalysisSessionCardProps {
  session: AnalysisSession;
  proposals: readonly AiProposal[];
  accountNames: ReadonlyMap<string, string>;
  busy: boolean;
  onShowSnapshot: (session: AnalysisSession) => void;
  onDeleteSession: (session: AnalysisSession) => void;
  onApplyProposal: (proposal: AiProposal) => void;
  onDismissProposal: (proposal: AiProposal) => void;
}

function AnalysisSessionCard({
  session,
  proposals,
  accountNames,
  busy,
  onShowSnapshot,
  onDeleteSession,
  onApplyProposal,
  onDismissProposal,
}: AnalysisSessionCardProps) {
  const parsedResponse = parseAnalysisResponse(session.responseText ?? '');
  return (
    <Card>
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
      <AppButton label="첨부 데이터 보기" variant="plain" onPress={() => onShowSnapshot(session)} />
      <AppButton
        label="분석 세션 삭제"
        variant="danger"
        disabled={busy}
        onPress={() => onDeleteSession(session)}
      />
      {proposals.map((proposal) => (
        <ProposalCard
          key={proposal.id}
          proposal={proposal}
          accountNames={accountNames}
          busy={busy}
          onApply={onApplyProposal}
          onDismiss={onDismissProposal}
        />
      ))}
    </Card>
  );
}

interface ProposalCardProps {
  proposal: AiProposal;
  accountNames: ReadonlyMap<string, string>;
  busy: boolean;
  onApply: (proposal: AiProposal) => void;
  onDismiss: (proposal: AiProposal) => void;
}

function ProposalCard({ proposal, accountNames, busy, onApply, onDismiss }: ProposalCardProps) {
  const payload = tryParsePlanChangePayload(proposal.payloadJson);
  const safeForDisplayAndApply = Boolean(
    payload
      && proposal.rationale.trim()
      && isAnalysisProseAllowed(proposal.rationale)
      && (payload.note === null || isAnalysisProseAllowed(payload.note)),
  );
  return (
    <View style={styles.proposal}>
      <View style={styles.rowBetween}>
        <Text style={textStyles.title}>주간 계획 변경안</Text>
        <Text style={textStyles.muted}>{PROPOSAL_STATUS_LABELS[proposal.status]}</Text>
      </View>
      {safeForDisplayAndApply && payload ? (
        <>
          <Text style={textStyles.body}>{proposal.rationale}</Text>
          <Text style={textStyles.muted}>대상 주: {payload.weekStart}</Text>
          {Object.entries(payload.minutesByAccount).map(([accountId, minutes]) => (
            <Text key={accountId} style={textStyles.number}>
              {accountNames.get(accountId) ?? accountId}: {minutes}분
            </Text>
          ))}
        </>
      ) : <Text style={styles.errorText}>제안 문구 또는 데이터를 안전하게 읽을 수 없습니다.</Text>}
      {proposal.status === 'pending' ? (
        <View style={styles.actions}>
          <AppButton label="무시" variant="secondary" disabled={busy} onPress={() => onDismiss(proposal)} />
          <AppButton label="계획에 적용" disabled={busy || !safeForDisplayAndApply} onPress={() => onApply(proposal)} />
        </View>
      ) : null}
    </View>
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
});
