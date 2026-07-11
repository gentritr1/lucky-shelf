import { View, type ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { type ComponentProps } from 'react';

import { buildAccents, tagIcon, tagIconFallback } from '../tokens';
import { usePalette } from '../prefs';

/**
 * The ONE place a build/synergy tag becomes an icon (ICON-2). Replaces the old
 * chrome emojis with MaterialCommunityIcons tinted by the tag's build accent, so
 * an archetype reads identically on the supplier picker, the run HUD build hero,
 * and the summary recap — and obeys the palette like everything else.
 *
 * `tagIcon` (tokens) is the single tag→glyph mapping; no screen names its own
 * icon. Colors come from `usePalette()`/`buildAccents` so the icon re-themes
 * under the high-contrast pref.
 */

type MCIName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/** The glyph name for a tag (single source of truth), typed for MCI. */
export function tagIconName(tag: string): MCIName {
  return (tagIcon[tag] ?? tagIconFallback) as MCIName;
}

/** ~15% accent-over-accent tint bed (hex alpha), derived from the accent hue. */
function tintBed(accentHex: string): string {
  return `${accentHex}26`;
}

interface TagIconProps {
  tag: string;
  /** Glyph size in px. */
  size?: number;
  /** Glyph color; defaults to the tag's build accent. */
  color?: string;
  /** Wrap the glyph in a soft accent-tinted circle. */
  badge?: boolean;
  /** Circle diameter when `badge` (defaults to ~1.9× the glyph). */
  badgeSize?: number;
}

export function TagIcon({ tag, size = 16, color, badge = false, badgeSize }: TagIconProps) {
  const palette = usePalette();
  const accent = buildAccents[tag] ?? palette.goldDeep;
  const glyph = <MaterialCommunityIcons name={tagIconName(tag)} size={size} color={color ?? accent} />;
  if (!badge) return glyph;

  const dim = badgeSize ?? Math.round(size * 1.9);
  const wrap: ViewStyle = {
    alignItems: 'center',
    backgroundColor: tintBed(accent),
    borderColor: accent,
    borderRadius: dim / 2,
    borderWidth: 1.5,
    height: dim,
    justifyContent: 'center',
    width: dim,
  };
  return <View style={wrap}>{glyph}</View>;
}
