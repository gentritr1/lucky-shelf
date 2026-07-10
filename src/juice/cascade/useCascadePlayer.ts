import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { TraceEvent } from '@/contracts';
import { motion } from '@/ui/tokens';
import { cascadeStepHaptic, haptic } from '../haptics';
import { buildKeyframes, emptyFrame, type CascadeFrame } from './cascadeState';
import { stepDurationMs } from './discoveryModel';

/**
 * The cascade sequencer: walks the trace one event per `cascadeStep` (260 ms at
 * 1×, 130 ms at 2×) and fires the escalating haptic ladder. Reduced motion keeps
 * this exact cadence and these exact haptics — only the visuals snap (R-28), so
 * the timing lives here and the visual duration folds in downstream.
 *
 * `skip` jumps to the terminal dayTotal and still plays the slam (+ rent thud on
 * due days, R-18). The control is always available (R-17).
 */

export type CascadeSpeed = 1 | 2;

interface UseCascadePlayerOptions {
  events: readonly TraceEvent[];
  rentDue?: boolean;
  autoPlay?: boolean;
  /**
   * B-M11: event indices that earn a brief slow-beat (the first-ever combo
   * discovery step). The dwell on such a step is extended by
   * `motion.discoverySlowBeat`. Pass an EMPTY set (the default, and what the
   * caller passes under reduced motion) to keep the exact shipped cadence.
   */
  slowBeatIndices?: ReadonlySet<number>;
}

const NO_SLOW_BEAT: ReadonlySet<number> = new Set();

export interface CascadePlayer {
  /** -1 before the first event resolves; otherwise the resolved event index. */
  stepIndex: number;
  frame: CascadeFrame;
  currentEvent: TraceEvent | null;
  playing: boolean;
  done: boolean;
  speed: CascadeSpeed;
  setSpeed: (speed: CascadeSpeed) => void;
  play: () => void;
  pause: () => void;
  restart: () => void;
  skip: () => void;
}

export function useCascadePlayer({
  events,
  rentDue = false,
  autoPlay = false,
  slowBeatIndices = NO_SLOW_BEAT,
}: UseCascadePlayerOptions): CascadePlayer {
  const frames = useMemo(() => buildKeyframes(events), [events]);
  const lastIndex = events.length - 1;

  const [stepIndex, setStepIndex] = useState(-1);
  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState<CascadeSpeed>(1);

  // Reset when a different trace is loaded.
  useEffect(() => {
    setStepIndex(-1);
    setPlaying(autoPlay);
  }, [events, autoPlay]);

  const done = stepIndex >= lastIndex;

  // Haptics fire when the resolved event index changes (skip included).
  const rentDueRef = useRef(rentDue);
  rentDueRef.current = rentDue;
  useEffect(() => {
    if (stepIndex < 0) return;
    const event = events[stepIndex];
    if (!event) return;
    switch (event.kind) {
      case 'ruleFire':
        cascadeStepHaptic(event.runningTotal);
        break;
      case 'comboNamed':
        haptic('comboBanner');
        break;
      case 'dayTotal':
        haptic('dayTotalSlam');
        if (rentDueRef.current) haptic('rentThud');
        break;
      default:
        break;
    }
  }, [stepIndex, events]);

  // Advance one event per step while playing.
  useEffect(() => {
    if (!playing || stepIndex >= lastIndex) {
      if (stepIndex >= lastIndex && playing) setPlaying(false);
      return;
    }
    // The dwell is on the CURRENTLY-shown step (`stepIndex`); a first-ever combo
    // discovery step lingers by `motion.discoverySlowBeat` (empty set ⇒ no change).
    const stepMs = stepDurationMs(motion.durations.cascadeStep, speed, slowBeatIndices.has(stepIndex));
    const timer = setTimeout(() => setStepIndex((i) => i + 1), stepMs);
    return () => clearTimeout(timer);
  }, [playing, stepIndex, lastIndex, speed, slowBeatIndices]);

  const play = useCallback(() => {
    setStepIndex((i) => (i >= lastIndex ? -1 : i));
    setPlaying(true);
  }, [lastIndex]);

  const pause = useCallback(() => setPlaying(false), []);

  const restart = useCallback(() => {
    setStepIndex(-1);
    setPlaying(true);
  }, []);

  const skip = useCallback(() => {
    setPlaying(false);
    setStepIndex(lastIndex);
  }, [lastIndex]);

  const frame = stepIndex >= 0 ? frames[stepIndex] ?? emptyFrame() : emptyFrame();
  const currentEvent = stepIndex >= 0 ? events[stepIndex] ?? null : null;

  return {
    stepIndex,
    frame,
    currentEvent,
    playing,
    done,
    speed,
    setSpeed,
    play,
    pause,
    restart,
    skip,
  };
}
