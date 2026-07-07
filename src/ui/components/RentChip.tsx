import { StyleSheet, Text, View } from 'react-native';

import { borders, palette, radii, spacing, typeScale } from '../tokens';

interface RentChipProps {
  amount: number;
  dueInDays: number;
}

/**
 * Rent proximity must be *felt* (kickoff §6): the chip warms from parchment
 * calm to ember alarm as the due day approaches. The room-wide dusk shift
 * lands at M4; this chip is the M0 seed of that gradient.
 */
export function RentChip({ amount, dueInDays }: RentChipProps) {
  const tone = dueInDays <= 1 ? styles.alarm : dueInDays === 2 ? styles.warm : styles.calm;
  const toneText = dueInDays <= 1 ? styles.alarmText : dueInDays === 2 ? styles.warmText : styles.calmText;
  const dayWord = dueInDays === 1 ? 'day' : 'days';
  return (
    <View style={[styles.chip, tone]}>
      <Text style={[styles.label, toneText]}>RENT {amount}</Text>
      <Text style={[styles.due, toneText]}>
        {dueInDays === 0 ? 'due today' : `due in ${dueInDays} ${dayWord}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    borderWidth: borders.regular,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  calm: {
    backgroundColor: palette.parchment,
    borderColor: palette.parchmentEdge,
  },
  warm: {
    backgroundColor: palette.sunlight,
    borderColor: palette.goldDeep,
  },
  alarm: {
    backgroundColor: palette.rentEmber,
    borderColor: palette.emberDark,
  },
  label: {
    ...typeScale.label,
  },
  due: {
    ...typeScale.body,
    fontSize: 13,
  },
  calmText: { color: palette.inkSoft },
  warmText: { color: palette.ink },
  alarmText: { color: palette.creamBright },
});
