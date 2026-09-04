import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { AppButton, Card, ChoiceRow, Section, StatusBanner, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { AnalysisRepository } from '@/data/analysis-repository';
import { useLocalMutationVersion } from '@/hooks/use-local-mutation-version';

import {
  DEFAULT_AI_SETTINGS_DRAFT,
  aiSettingsDraftFrom,
  createEditableDraft,
  hydrateEditableDraft,
  markEditableDraftSaved,
  patchEditableDraft,
  type AiSettingsDraft,
} from './drafts';

const RANGE_CHOICES = [
  { value: '4', label: '완료된 최근 4주' },
  { value: '8', label: '완료된 최근 8주' },
  { value: '12', label: '완료된 최근 12주' },
] as const;
const NOTE_CHOICES = [{ value: '1', label: '포함' }, { value: '0', label: '제외' }] as const;

interface AnalysisUsage {
  sessions: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export function AiSettingsSection() {
  const app = useApp();
  const database = useSQLiteContext();
  const repository = useMemo(() => new AnalysisRepository(database), [database]);
  const mutationVersion = useLocalMutationVersion();
  const [state, setState] = useState(() => createEditableDraft(DEFAULT_AI_SETTINGS_DRAFT));
  const [usage, setUsage] = useState<AnalysisUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [usageError, setUsageError] = useState<string | null>(null);
  const draft = state.value;

  useEffect(() => {
    setState((current) => hydrateEditableDraft(current, aiSettingsDraftFrom(app.snapshot.settings)));
  }, [app.snapshot.settings]);

  useEffect(() => {
    let active = true;
    setUsage(null);
    setUsageLoading(true);
    setUsageError(null);
    void repository.usageSummary()
      .then((summary) => {
        if (!active) return;
        setUsage(summary);
        setUsageError(null);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setUsageError(caught instanceof Error ? caught.message : '누적 사용량을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setUsageLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mutationVersion, repository]);

  function update(patch: Partial<AiSettingsDraft>) {
    setState((current) => patchEditableDraft(current, patch));
  }

  async function save() {
    const submitted = draft;
    await app.setSettings({
      analysis_range_weeks: submitted.rangeWeeks,
      analysis_include_notes: submitted.includeNotes,
    });
    setState((current) => markEditableDraftSaved(current, submitted));
    Alert.alert('AI 설정 저장', '분석 범위 설정을 저장했습니다. OpenAI 키는 Supabase 서버 secret으로만 관리됩니다.');
  }

  return (
    <Section title="AI 분석">
      {usageError ? (
        <StatusBanner
          message={`누적 AI 사용량을 불러오지 못했습니다: ${usageError}`}
          onClose={() => setUsageError(null)}
        />
      ) : null}
      <Card>
        <Text style={textStyles.body}>
          제공자·모델은 동기화 가능한 일반 설정이고 OpenAI API 키는 Supabase 서버 secret으로만 관리됩니다.
        </Text>
        <Text style={textStyles.muted}>
          API 키는 앱·SQLite·동기화 데이터·로그·JSON/CSV 내보내기에 포함하지 않습니다.
        </Text>
        <Text style={textStyles.body}>제공자·모델 정책 · 서버 구성</Text>
        <Text style={textStyles.muted}>실제 제공자, 모델, 추론 수준, 토큰과 비용은 분석 기록마다 보존됩니다.</Text>
        <Text style={textStyles.muted}>ChatGPT 구독과 API 사용 요금은 별도입니다.</Text>
        <ChoiceRow
          label="기본 분석 기간"
          choices={RANGE_CHOICES}
          value={draft.rangeWeeks}
          onChange={(rangeWeeks) => update({ rangeWeeks })}
        />
        <ChoiceRow
          label="메모 첨부"
          choices={NOTE_CHOICES}
          value={draft.includeNotes}
          onChange={(includeNotes) => update({ includeNotes: includeNotes === '1' ? '1' : '0' })}
        />
        {usage ? (
          <Text style={textStyles.muted}>
            누적 사용 · {usage.sessions}세션 · 입력 {usage.inputTokens}토큰 · 출력 {usage.outputTokens}토큰 · 추정 ${usage.estimatedCostUsd.toFixed(6)}
          </Text>
        ) : (
          <Text style={textStyles.muted}>
            {usageLoading ? '누적 사용량을 확인하는 중입니다.' : '누적 사용량을 표시할 수 없습니다.'}
          </Text>
        )}
        <View style={styles.actions}>
          <AppButton label="AI 설정 저장" onPress={() => void save().catch(() => undefined)} disabled={app.busy} />
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
