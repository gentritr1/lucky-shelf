/** Receipt surface — renders a ScoringTrace as a paper shop receipt (B-M8). */

export {
  receiptFromTrace,
  receiptDepsFromGameState,
  formatReceipt,
  deltaLabel,
  prettifySlug,
  causeHasSource,
  type ReceiptLine,
  type ReceiptLineKind,
  type ReceiptLineDetail,
  type ReceiptDeps,
  type ReceiptDepsOptions,
} from './receiptModel';
export { visibleReceiptLines, receiptComplete } from './print';
export {
  captionForLine,
  receiptCaptionForStep,
  type ReceiptCaption,
} from './caption';
