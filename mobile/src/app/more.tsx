import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Heading, Screen, Section, textStyles } from '@/components/ui';
import { visibleMoreGroups } from '@/features/more/menu-config';
import { COLORS } from '@/theme/colors';
import { tokens } from '@/theme/tokens';

export default function MoreScreen() {
  return (
    <Screen>
      <Heading subtitle="기록과 계획에 필요한 기능을 관리합니다.">더보기</Heading>
      {visibleMoreGroups(['core', 'personal-ai']).map((group) => (
        <Section key={group.id} title={group.title}>
          <View style={styles.group}>
            {group.destinations.map((destination, index) => (
              <Pressable
                key={destination.id}
                accessibilityRole="button"
                accessibilityLabel={`${destination.title}, ${destination.description}`}
                onPress={() => router.push(destination.route as Href)}
                style={({ pressed }) => [
                  styles.row,
                  index < group.destinations.length - 1 && styles.rowDivider,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.copy}>
                  <Text style={textStyles.title}>{destination.title}</Text>
                  <Text style={textStyles.muted}>{destination.description}</Text>
                </View>
                <Text accessible={false} style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
        </Section>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { overflow: 'hidden', backgroundColor: COLORS.surfaceRaised, borderRadius: tokens.radius.card, paddingHorizontal: tokens.space.sm },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: tokens.space.xxs },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  copy: { flex: 1, gap: 4 },
  chevron: { color: COLORS.muted, fontSize: 26, lineHeight: 28, fontWeight: '300' },
  pressed: { backgroundColor: COLORS.surfaceSubtle },
});
