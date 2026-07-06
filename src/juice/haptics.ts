import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { cascadeEscalation, hapticMap } from '@/ui/tokens';
import { usePrefs } from '@/ui/prefs';

/**
 * The single haptic gateway (kickoff §6 / motion-spec). Components and juice
 * layers NEVER call expo-haptics directly — they name a choreography entry
 * from `hapticMap` and this module routes it. That keeps the whole haptic
 * vocabulary in tokens and swappable.
 *
 * Reduced-motion mode keeps haptics (they ARE the reduced-motion channel); the
 * user-facing `hapticsEnabled` pref is the only gate. Web is a silent no-op.
 */

type HapticName = keyof typeof hapticMap;
type HapticToken = (typeof hapticMap)[HapticName];

function play(token: HapticToken): void {
  if (Platform.OS === 'web') return;
  if (!usePrefs.getState().hapticsEnabled) return;

  // Fire-and-forget: haptics must never block a frame or reject into the UI.
  switch (token) {
    case 'selection':
      void Haptics.selectionAsync().catch(noop);
      return;
    case 'impact-light':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(noop);
      return;
    case 'impact-medium':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(noop);
      return;
    case 'impact-heavy':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(noop);
      return;
    case 'notification-error':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(noop);
      return;
    case 'notification-success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(noop);
      return;
    default:
      assertNever(token);
  }
}

/** Fire a named haptic from the choreography map. */
export function haptic(name: HapticName): void {
  play(hapticMap[name]);
}

/**
 * Cascade step escalation (motion-spec §4): haptic intensity climbs with the
 * running total. Below `mediumAt` → light, up to `heavyAt` → medium, then heavy.
 * Wired now so M2's cascade layer only has to call this per `ruleFire`.
 */
export function cascadeStepHaptic(runningTotal: number): void {
  if (runningTotal >= cascadeEscalation.heavyAt) {
    haptic('cascadeStepBig');
  } else if (runningTotal >= cascadeEscalation.mediumAt) {
    haptic('cascadeStepMedium');
  } else {
    haptic('cascadeStepSmall');
  }
}

function noop(): void {}

function assertNever(value: never): never {
  throw new Error(`Unhandled haptic token: ${String(value)}`);
}
