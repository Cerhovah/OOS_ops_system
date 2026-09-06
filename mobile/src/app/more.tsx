import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Heading, Screen, Section, textStyles } from '@/components/ui';
import { COLORS } from '@/theme/colors';

const destinations = [
  { href: '/week', label: '주간', description: '계정별 계획·실제·차이를 봅니다.' },
  { href: '/plan', label: '계획', description: '주간 계획과 이력을 관리합니다.' },
  { href: '/projects', label: '프로젝트', description: '프로젝트와 KPI를 관리합니다.' },
  { href: '/analysis', label: '분석', description: '저장된 데이터를 바탕으로 분석을 엽니다.' },
  { href: '/settings', label: '설정', description: '항목·계정·동기화·내보내기를 관리합니다.' },
] as const;

export default function MoreScreen() {
  return (
    <Screen>
      <Heading subtitle="기존 기능은 유지하고 기록 흐름 밖으로 옮겼습니다.">더보기</Heading>
      <Section title="기능">
        {destinations.map((destination) => (
          <View key={destination.href} style={styles.row}>
            <View style={styles.copy}>
              <Text style={textStyles.title}>{destination.label}</Text>
              <Text style={textStyles.muted}>{destination.description}</Text>
            </View>
            <AppButton label="열기" variant="secondary" onPress={() => router.push(destination.href)} />
          </View>
        ))}
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  copy: { flex: 1, gap: 4 },
});
