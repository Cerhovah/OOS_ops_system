import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { ANALYSIS_MODEL, ANALYSIS_PROVIDER, ANALYSIS_TOKEN_PRICE } from '@/analysis/provider-registry';
import { AppButton, Card, ChoiceRow, Section, textStyles } from '@/components/ui';
import { useApp } from '@/context/app-context';
import { AnalysisRepository } from '@/data/analysis-repository';

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

const EMPTY_USAGE: AnalysisUsage = { sessions: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };

export function AiSettingsSection() {
  const app = useApp();
  const database = useSQLiteContext();
  const repository = useMemo(() => new AnalysisRepository(database), [database]);
  const [state, setState] = useState(() => createEditableDraft(DEFAULT_AI_SETTINGS_DRAFT));
  const [usage, setUsage] = useState<AnalysisUsage>(EMPTY_USAGE);
  const draft = state.value;

  useEffect(() => {
    setState((current) => hydrateEditableDraft(current, aiSettingsDraftFrom(app.snapshot.settings)));
  }, [app.snapshot.settings]);

  useEffect(() => {
    let active = true;
    void repository.usageSummary()
      .then((summary) => {
        if (active) setUsage(summary);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [repository]);

  function update(patch: Partial<AiSettingsDraft>) {
    setState((current) => patchEditableDraft(current, patch));
  }

  async function save() {
    const submitted = draft;
    await app.setSettings({
      analysis_range_weeks: submitted.rangeWeeks,
      analysis_include_notes: submitted.includeNotes,
      ai_provider: ANALYSIS_PROVIDER,
      ai_model: ANALYSIS_MODEL,
    });
    setState((current) => markEditableDraftSaved(current, submitted));
    Alert.alert('AI 설정 저장', '분석 범위 설정을 저장했습니다. OpenAI 키는 Supabase 서버 secret으로만 관리됩니다.');
  }

  return (
    <Section title="AI 분석">
      <Card>
        <Text style={textStyles.body}>
          제공자·모델은 동기화 가능한 일반 설정이고 OpenAI API 키는 Supabase 서버 secret으로만 관리됩니다.
        </Text>
        <Text style={textStyles.muted}>
          API 키는 앱·SQLite·동기화 데이터·로그·JSON/CSV 내보내기에 포함하지 않습니다.
        </Text>
        <Text style={textStyles.body}>제공자 · {ANALYSIS_PROVIDER}</Text>
        <Text style={textStyles.body}>모델 · {ANALYSIS_MODEL}</Text>
        <Text style={textStyles.muted}>
          현재 단가 · 입력 ${ANALYSIS_TOKEN_PRICE.inputPerMillionUsd}/백만 토큰 · 출력 ${ANALYSIS_TOKEN_PRICE.outputPerMillionUsd}/백만 토큰
        </Text>
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
        <Text style={textStyles.muted}>
          누적 사용 · {usage.sessions}세션 · 입력 {usage.inputTokens}토큰 · 출력 {usage.outputTokens}토큰 · 추정 ${usage.estimatedCostUsd.toFixed(6)}
        </Text>
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
