import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Heading, Screen, Section, textStyles } from '@/components/ui';
import { visibleMoreGroups } from '@/features/more/menu-config';
import { COLORS } from '@/theme/colors';

export default function MoreScreen() {
  return (
    <Screen>
      <Heading subtitle="기존 기능은 유지하고 기록 흐름 밖으로 옮겼습니다.">더보기</Heading>
      {visibleMoreGroups(['core', 'personal-ai']).map((group) => (
        <Section key={group.id} title={group.title}>
          {group.destinations.map((destination) => (
            <View key={destination.id} style={styles.row}>
              <View style={styles.copy}>
                <Text style={textStyles.title}>{destination.title}</Text>
                <Text style={textStyles.muted}>{destination.description}</Text>
              </View>
              <AppButton label="열기" variant="secondary" onPress={() => router.push(destination.route as Href)} />
            </View>
          ))}
        </Section>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  copy: { flex: 1, gap: 4 },
});
