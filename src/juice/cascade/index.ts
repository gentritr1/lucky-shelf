/** Cascade surface — consumes a ScoringTrace and animates every coin (Pillar 2). */

export { CascadeLayer } from './CascadeLayer';
export { SpeedControl } from './SpeedControl';
export { CascadeArrow } from './CascadeArrow';
export { useCascadePlayer, type CascadePlayer, type CascadeSpeed } from './useCascadePlayer';
export {
  buildKeyframes,
  applyEvent,
  emptyFrame,
  runningTotalAt,
  type CascadeFrame,
  type SlotDisplay,
} from './cascadeState';
