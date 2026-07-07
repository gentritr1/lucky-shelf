import { toSlotKey, type RuleDelta, type TraceEvent } from '@/contracts';

/**
 * Pure cascade-pop model (no React/Reanimated so it's unit-testable in node).
 *
 * A `ruleFire` whose source and target are the same slot has no arrow distance
 * to draw — the rule scored its own slot (spotlight, order, loner bonus, the
 * Antique Clock). Those render as an on-slot ×N/+N pop; every multi-slot fire
 * still draws a source→target arrow. The test is geometric on purpose: it needs
 * no ruleId allowlist, so any future self-scoring rule is handled automatically.
 */
export function isSelfFire(event: TraceEvent): boolean {
  return event.kind === 'ruleFire' && toSlotKey(event.sourceSlot) === toSlotKey(event.targetSlot);
}

/** ×N for a multiplier fire, +N/-N for a flat one — the label on an on-slot pop. */
export function deltaLabel(delta: RuleDelta): string {
  if (delta.mult !== undefined) return `×${delta.mult}`;
  if (delta.flat !== undefined) return `${delta.flat >= 0 ? '+' : ''}${delta.flat}`;
  return '';
}
