import type { ReceiptLine } from './receiptModel';

/**
 * One compact, spoken-friendly explanation for the cascade's current receipt
 * step. This is presentation grammar only: every value comes from ReceiptLine,
 * which already consumes the frozen ScoringTrace verbatim.
 */
export interface ReceiptCaption {
  eventIndex: number;
  title: string;
  explanation: string;
  accessibilityLabel: string;
}

export function receiptCaptionForStep(
  lines: readonly ReceiptLine[],
  stepIndex: number,
): ReceiptCaption | null {
  if (stepIndex < 0) return null;
  const line = [...lines].reverse().find((candidate) => candidate.eventIndex <= stepIndex);
  return line ? captionForLine(line) : null;
}

export function captionForLine(line: ReceiptLine): ReceiptCaption {
  const caption = (() => {
    switch (line.detail.kind) {
      case 'item':
        return {
          title: line.detail.itemName,
          explanation: `Starts at ${line.detail.base}`,
        };
      case 'cause':
        return {
          title: `${line.detail.sourceName} → ${line.detail.affectedName}`,
          explanation:
            `${line.detail.ruleLabel} ${line.detail.deltaLabel} · now ${line.detail.runningTotal}`,
        };
      case 'aura':
        return {
          title: `${line.detail.sourceName} → Row ${line.detail.row + 1}`,
          explanation: `Row aura ×${line.detail.mult}`,
        };
      case 'combo':
        return {
          title: line.detail.comboName,
          explanation: `Named combo · ${line.detail.slots.length} items`,
        };
      case 'transform':
        return {
          title: `${line.detail.fromName} → ${line.detail.toName}`,
          explanation: 'Transformation',
        };
      case 'vanish':
        return {
          title: line.detail.itemName,
          explanation: 'Left the shelf',
        };
      case 'subtotal':
        return {
          title: line.detail.itemName,
          explanation: line.detail.appliedAura
            ? `Subtotal ${line.detail.total} after row ×${line.detail.appliedAura.mult}`
            : `Subtotal ${line.detail.total}`,
        };
      case 'total':
        return {
          title: 'Day total',
          explanation: `${line.detail.coins} coins`,
        };
    }
  })();

  return {
    eventIndex: line.eventIndex,
    ...caption,
    accessibilityLabel: `${caption.title}. ${caption.explanation}`,
  };
}
