# Lane B brief — B-M10: share polish — friendly seed labels + receipt-bodied card

**Author:** Fable, 2026-07-09. **Implementer:** Opus 4.8 (parallel-safe with B-M5 P2–3 and B-M9
EXCEPT `summary.tsx`/share surfaces — check the tree; if another lane holds those files
uncommitted, coordinate or wait). **Review:** Fable; visuals join the batched device gate.

## Context (self-sufficient)
Daily runs are seeded `daily-YYYY-MM-DD` (`src/persistence/daily.ts`); the share card
(`src/app/share.tsx`, image pipeline via react-native-view-shot) already carries score stats +
the streak line. B-M8 landed `formatReceipt` (`src/juice/receipt`) — a pure paper-text body for
a day's scoring. Design reference: the human's design-review mockup (Daily Challenge card,
"Seed: CLOVER-713", polaroid paper framing) — jury Prototype-Soon "daily/share basics" +
"friendly seed labels". Anti-casino tone: paper/ink/brass, no jackpot language.

## Work items
1. **Friendly seed labels:** a pure codec `seedLabel(seed): string` (new small module, suggest
   `src/state/seedLabel.ts` or alongside the daily persistence) mapping any seed
   deterministically to `WORD-NNN` (e.g. CLOVER-713) from a curated cozy word list (~64 words —
   shop/luck/botanical themed, no gambling words). Same seed → same label forever (it will be
   spoken between players); collisions acceptable (label is a nickname, not a key — say so in a
   comment). Unit tests: determinism, format, list hygiene (no dupes).
2. **Surface the label** on the daily share card ("Seed: CLOVER-713") and the daily summary
   header — nowhere else for now.
3. **Receipt-bodied card option:** the share flow gains a second card variant, "receipt", whose
   body is `formatReceipt` of the run's best day (`lastScoringTrace` of that day is not
   persisted per-day — use the FINAL day's trace, which IS on `GameState.lastScoringTrace`, and
   label it honestly, e.g. "closing day"; do NOT add persistence for historical traces — if the
   best-day trace matters, note it as a follow-up for Fable). Paper texture, ink text, brass
   total, same view-shot pipeline.

## Non-goals
No leaderboards/percentiles (post-MVP with ghosts), no sim/persistence changes, no historical
trace storage, no polaroid art asset work beyond existing tokens (art direction is the device
gate's call), no non-daily share changes beyond the variant picker.

## Acceptance
1. Suite + tsc green; codec tests as above; a snapshot test for one receipt-card body (fixed
   trace → fixed text).
2. Boundary/tokens greps clean; card variant defaults to the existing card (receipt is opt-in
   via a simple toggle on the share screen — no new prefs).
3. Deferred device shots listed with seeds: daily card with label, receipt card 16 Pro + SE.

## Deliverable
`docs/review-packets/B-M10-share-polish-review.md`, usual form. **STOP — Fable reviews.**
