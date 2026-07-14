# B-M16 — device round-4 polish (human eyeball, 2026-07-14)

**Ruled by:** Fable. **Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip` on `ad5c096`.
**IMPORTANT — working tree state:** `src/ui/featureFlags.ts` has a DELIBERATE uncommitted edit
(`PICTURE_GALLERY_ENABLED = true`) for the human's live test drive. Leave that file exactly as it
is; do not revert, do not include it in your packet's diff accounting beyond noting it. Metro is
already running on 8081 and the app is installed on the booted iPhone 16 Pro sim.
**Sim etiquette (new rule, the human just lost their sim save to agent cleanup):** if you seed
storage for verification, FIRST export/preserve the existing AsyncStorage state and RESTORE it
after, or seed via a separate temporary state that you restore; never end with cleared storage.

Three items from the human's live session:

## Item 1 (bug) — The Paintings screen: clipped caption + missing bottom inset

On the gallery screen (`src/app/gallery.tsx`), the per-painting progress caption row clips its
trailing fraction at the right edge ("…reveal pieces 0 ‹cut›" — the "of 16" is off-screen), and the
last painting's section runs into the bottom edge with no safe-area/bottom padding.

Fix: caption row must wrap or reserve minWidth for the fraction (long captions + large fractions
coexist at 130% too); scroll content gets bottom inset padding per the app's standard
(`insets.bottom + layout.screenBottomGap` pattern used by run.tsx). Acceptance: sim shots of the
LAST painting section at normal and 130% text with the full fraction visible and comfortable
bottom clearance.

## Item 2 (human REQUEST CHANGES) — Collector's Journal header is too cramped

Human verdict on-device: "too messy… too many things, too cramped." Decram the header while
keeping the journal identity. Fable's direction:

- The header card keeps ONLY: masthead (clover + title), the big completionPct + COMPLETE, the
  "N / M items discovered" line, and the NEXT MILESTONE row. Generous internal spacing (at least
  spacing.md between groups; let it breathe like the concept's paper page).
- REMOVE the milestone dot-scale (decorative; first thing to go when cramped).
- MOVE the combos wax-seal out of the header — combos coverage already lives in the trophy-shelf
  stamp; the seal was redundant.
- MOVE the four stat cells (Runs/Best day/Longest run/Deepest rent) into their own SEPARATE slim
  strip BELOW the stamps row (a quiet single-row ledger strip, or two-per-row at 130%) — visually
  secondary, not inside the hero card.
- The Paintings entry card and stamps row stay as shipped.
- VoiceOver summary label updates to match the reduced header.

Acceptance: sim shots normal + 130% + HC of the catalog top; the header card must read as FOUR
distinct, airy groups max. Update the transcription styles test; keep all data present somewhere
on screen (nothing deleted from the screen entirely — relocated only).

## Item 3 (feel) — rent day isn't intense enough (presentation only)

Human: the day rent is due doesn't feel intense. Economy numbers are OUT OF SCOPE (Gate 1.2 is
tuned and closed — zero constants change). Build the PRESENTATION escalation, all reduced-motion
and prefs-audio safe:

- **Rent-eve (dueInDays === 1):** deepen the existing `DuskAmbience` treatment one visible notch
  (it already keys off dueInDays — add a distinct final-day stage), and the HUD `RentChip` gains a
  subtle ember pulse (slow, 2–3s period, uniform scale/opacity only — the Fabric transform scar:
  no scaleX/scaleY splits, assign with*() results only to .value/style).
- **Rent-payment moment (the scoring overlay when rent deducts):** a small payment beat — the rent
  line/chip does a single heavier settle (existing thud sound hook), and the coin counter's
  deduction gets a brief drain tick-down rather than an instant jump. No new sounds required; wire
  through the existing audio gateway points so a future bed/sting swap is one asset.
- **Audio hook (asset-ready):** add a named, currently-silent gateway slot for a "rent-eve bed"
  variant so the incoming Suno asset drops in without code changes. Follow the audio-system
  memory's gateway + per-screen bed pattern.

Acceptance: sim shots of rent-eve HUD (pulse end-state) + the payment moment; a short note on
where the bed slot lives; reduced-motion = static ember tint, no pulse; audio-prefs-off = no sound
calls (assert via the gateway's existing test pattern).

## Verification & deliverables

`npx tsc --noEmit`; `npx vitest run --no-file-parallelism` 100% green (baseline 418); fixtures 7/7
untouched; zero sim/contract/item/fixture changes (presentation + juice only — DuskAmbience/
RentChip/gallery.tsx/catalog.tsx/styles/audio gateway). Shots to
`docs/review-packets/shots-b-m16/`. Packet `docs/review-packets/B-M16-device-round4.md` (per-item
what/why/verification, executed-vs-inferred, open eyeball gates). Leave everything uncommitted
(including the pre-existing flag flip). Restore any sim storage you touch.

## Non-goals

Economy/rent numbers, new audio assets (human is generating via Suno separately), gallery
mechanics, committing.
