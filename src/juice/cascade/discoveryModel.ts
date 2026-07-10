import type { TraceEvent } from '@/contracts';

/**
 * B-M11 combo-discovery model (pure). Classifies each `comboNamed` event in a
 * scoring trace as a discovery moment, so the cascade presentation can react
 * without a second clock — every moment carries the `eventIndex` it fires on,
 * which is exactly the cascade player's `stepIndex`.
 *
 * Three tiers (the jury's "discovery moments", B-M6 anti-casino identity — warm
 * recognition, never a second jackpot):
 *   - `first-ever`      — never achieved before this run (∉ the run-start catalog).
 *                          The full moment: toast + stamp + jingle + slow-beat.
 *   - `first-this-run`  — achieved in a PRIOR run, but the first time THIS run.
 *                          A small toast only.
 *   - `repeat`          — already seen earlier THIS run (an earlier day, or an
 *                          earlier fire in this same trace). Nothing new.
 *
 * Pure: no store, no sim, no side effects. The caller supplies the two sets.
 */

export type DiscoveryKind = 'repeat' | 'first-this-run' | 'first-ever';

export interface DiscoveryMoment {
  /** Index into `trace.events` — equals the cascade player's `stepIndex`. */
  eventIndex: number;
  comboId: string;
  kind: DiscoveryKind;
}

export interface DiscoveryInputs {
  /**
   * Combos achieved all-time BEFORE this run started (`catalog.achievedComboIds`
   * at run start). Distinguishes `first-ever` from `first-this-run`. During a run
   * this equals the live catalog set, because a run only merges into the catalog
   * at run end (see `catalogStore.recordRunEnd`).
   */
  achievedBeforeRun: ReadonlySet<string>;
  /**
   * Combos already discovered EARLIER this run, before this trace (i.e. on prior
   * days). A combo here reads as `repeat` on its next fire. Optional; omit for a
   * single-day run or the first day.
   */
  seenPriorThisRun?: ReadonlySet<string>;
}

/**
 * Classify every `comboNamed` in `events`. Non-combo events are skipped (they
 * carry no discovery), but the returned `eventIndex` is the true position in
 * `events`, so presentation syncs to the cascade clock exactly.
 *
 * Within-trace dedup: the FIRST fire of a combo this run is `first-ever` /
 * `first-this-run`; any later fire (same trace or a later day via
 * `seenPriorThisRun`) is `repeat`.
 */
export function classifyDiscoveries(
  events: readonly TraceEvent[],
  inputs: DiscoveryInputs,
): DiscoveryMoment[] {
  const { achievedBeforeRun, seenPriorThisRun } = inputs;
  // Mutable running set of combos already encountered this run. Seeded with prior
  // days so a cross-day repeat is caught, then grown as we walk this trace.
  const seenThisRun = new Set<string>(seenPriorThisRun ?? []);
  const moments: DiscoveryMoment[] = [];

  events.forEach((event, eventIndex) => {
    if (event.kind !== 'comboNamed') return;
    const comboId = event.comboId;
    let kind: DiscoveryKind;
    if (seenThisRun.has(comboId)) {
      kind = 'repeat';
    } else if (achievedBeforeRun.has(comboId)) {
      kind = 'first-this-run';
      seenThisRun.add(comboId);
    } else {
      kind = 'first-ever';
      seenThisRun.add(comboId);
    }
    moments.push({ eventIndex, comboId, kind });
  });

  return moments;
}

const NO_INDICES: ReadonlySet<number> = new Set();

/**
 * The set of event indices that earn a slow-beat — the `first-ever` moments —
 * for the cascade player's step-duration multiplier. Returns an empty set when
 * `enabled` is false (reduced motion), which keeps the player's cadence
 * byte-identical to before this feature.
 */
export function slowBeatStepIndices(
  moments: readonly DiscoveryMoment[],
  enabled: boolean,
): ReadonlySet<number> {
  if (!enabled) return NO_INDICES;
  const indices = new Set<number>();
  for (const moment of moments) {
    if (moment.kind === 'first-ever') indices.add(moment.eventIndex);
  }
  return indices;
}
