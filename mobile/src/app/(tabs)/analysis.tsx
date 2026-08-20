import { Text } from 'react-native';

import { Card, Heading, Screen, Section, textStyles } from '@/components/ui';

export default function AnalysisScreen() {
  return (
    <Screen>
      <Heading subtitle="저장된 데이터를 직접 쓰거나 변경하지 않습니다.">분석</Heading>
      <Section title="Phase 4에서 활성화">
        <Card>
          <Text style={textStyles.body}>감사 · 패턴 · 프로젝트 · 최적화 · 장기 · 자유질문 모드는 Phase 4 범위입니다.</Text>
          <Text style={textStyles.muted}>Phase 1에서는 로컬 기록과 계획·실제 숫자만 제공합니다.</Text>
        </Card>
      </Section>
    </Screen>
  );
}
