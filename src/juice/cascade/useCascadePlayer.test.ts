import { describe, expect, it } from 'vitest';

import { motion } from '@/ui/tokens';
import { stepDurationMs } from './discoveryModel';

type CascadeSpeed = 1 | 2;

/**
 * B-M11 slow-beat is a step-DURATION multiplier and nothing else. These prove:
 *  (a) with `slow === false` the dwell reproduces the SHIPPED formula exactly
 *      (`Math.round(cascadeStep / speed)`), so the reduced-motion / no-discovery
 *      path is byte-identical in cadence;
 *  (b) with `slow === true` the dwell is the same base extended by
 *      `motion.discoverySlowBeat`, only on that step.
 */
const base = motion.durations.cascadeStep;
const speeds: CascadeSpeed[] = [1, 2];

describe('stepDurationMs — B-M11 slow-beat', () => {
  it('reproduces the shipped cadence exactly when not slow (reduced-motion path)', () => {
    for (const speed of speeds) {
      // The literal pre-B-M11 formula, unchanged.
      expect(stepDurationMs(base, speed, false)).toBe(Math.round(base / speed));
    }
  });

  it('extends only that step by motion.discoverySlowBeat when slow', () => {
    for (const speed of speeds) {
      expect(stepDurationMs(base, speed, true)).toBe(
        Math.round((base / speed) * motion.discoverySlowBeat),
      );
      // And it is strictly longer than the normal dwell (a real lingering beat).
      expect(stepDurationMs(base, speed, true)).toBeGreaterThan(stepDurationMs(base, speed, false));
    }
  });
});
