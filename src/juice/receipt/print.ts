import type { ReceiptLine } from './receiptModel';

/**
 * Receipt print cadence — a pure selector over the cascade player's existing
 * clock. There is NO second timer: the cascade player already advances one trace
 * event per `cascadeStep` (see `useCascadePlayer`), and every `ReceiptLine`
 * carries the `eventIndex` that reveals it. The receipt "prints" a line the
 * instant the cascade resolves that event, so pass the player's `stepIndex`
 * straight in.
 *
 * Reduced motion short-circuits ONLY the print animation: pass `revealAll` (the
 * caller reads `useReducedMotion()`) and the whole receipt is present at once —
 * same lines, no per-line reveal (R-28 parity with the cascade).
 */
export function visibleReceiptLines(
  lines: readonly ReceiptLine[],
  stepIndex: number,
  revealAll = false,
): ReceiptLine[] {
  if (revealAll) return [...lines];
  if (stepIndex < 0) return [];
  return lines.filter((line) => line.eventIndex <= stepIndex);
}

/** True once the terminal `total` line has printed — the receipt is complete. */
export function receiptComplete(
  lines: readonly ReceiptLine[],
  stepIndex: number,
  revealAll = false,
): boolean {
  const total = lines.find((line) => line.kind === 'total');
  if (!total) return false;
  return revealAll || stepIndex >= total.eventIndex;
}
