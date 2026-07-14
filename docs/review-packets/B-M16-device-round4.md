# B-M16 — device round-4 polish (implementation packet)

**Implementer:** Opus 4.8 (Lane B). **Branch:** `graduation-flip` at `ad5c096` (everything UNCOMMITTED per brief).
**Brief:** `docs/lane-b/device-round4-polish-brief.md` + Fable's mid-flight Item 4 addition (combos medals "look square").
**Shots:** `docs/review-packets/shots-b-m16/`. All device evidence = iPhone 16 Pro sim (iOS 18.6), Metro dev build.

**Working-tree accounting:** 14 files changed for B-M16 (listed per item below) + the PRE-EXISTING deliberate
`src/ui/featureFlags.ts` flip (`PICTURE_GALLERY_ENABLED = true`) which was left exactly as found — re-verified
after all work: that diff is still the single line. `docs/lane-b/device-round4-polish-brief.md` and the shots
dir are new untracked files. The TEMP-VERIFY harness used for seeding was fully removed
(`grep -rn "TEMP-VERIFY\|BM16_" src/` → empty — **executed**).

**Sim storage etiquette (the new rule):** AsyncStorage was backed up FIRST
(`scratchpad/asyncstorage-backup/` — it was EMPTY; consistent with the lost save). All state seeding was
IN-MEMORY (zustand `setState` at a temp module hook; prefs seeded with `loaded: true` so the boot hydrate
no-ops — zero storage reads/writes). The two keys my Open Shop verification taps persisted
(`activeRun` save + onboarding done) were deleted afterwards; final state = empty storage, byte-equal to the
backup (**executed** — `ls` of both shown in transcript), app relaunched fresh to the title screen.

---

## Item 1 (bug) — gallery caption clip + bottom inset

**What:** `src/app/gallery.tsx` + `src/screen-styles/gallery.styles.ts`. The caption row's text now takes
`flex: 1` and wraps; the fraction gets `flexShrink: 0` + right alignment so it can never be pushed
off-screen. (`captionRow` alignment moved to `flex-start` so a wrapped caption tops-aligns with the fraction.)

**Why the bug happened:** both texts were unconstrained row children with `space-between` — a long
`sourceCaption` ("Play runs, set records, and find signature pieces") consumed the full width and shoved the
`progressLabel` ("0 of 16") past the right edge.

**Bottom inset finding:** the brief's second symptom (missing bottom inset) did **not reproduce** — line 80 of
gallery.tsx already applies `insets.bottom + layout.screenBottomGap`, and the last painting's section shows
comfortable clearance in the shots. No change made there; if the human saw a cramped bottom on device it may
have been the *caption clip* making the last row read broken. Flagged for the eyeball.

**Verification (executed):** pre-fix reproduced on-sim (`item1-gallery-caption-clip-PREFIX.png` — "…0" with
"of 16" cut). Post-fix: `item1-gallery-lastpainting-normal-FIXED.png` and
`item1-gallery-lastpainting-130-FIXED.png` — full "0 of 16" on BOTH long-caption paintings, wrapped captions,
clear bottom gap, at normal and 130% (130% seeded in-memory via `usePrefs.setState`).

## Item 2 (REQUEST CHANGES) — Collector's Journal header decram

**What:** `src/app/catalog.tsx` + `src/screen-styles/catalog.styles.ts` (+ transcription test).
- Header card now holds exactly: masthead, big `%` + COMPLETE, `N / M items discovered`, NEXT MILESTONE row.
  Card `gap` raised `spacing.sm → spacing.md`; a new `journalHead` group adds `spacing.md` between masthead
  and the headline row. Three visual groups — under the "four airy groups max" bound.
- Milestone dot-scale REMOVED (component + styles deleted; `milestoneScaleView` stays exported in the store —
  its unit tests still cover it).
- Combos wax seal REMOVED from the header — combos coverage remains on-screen on the COMBOS stamp
  (`0/20` in the tab strip), satisfying "relocated only, nothing deleted from the screen".
- Four stat cells relocated to a new `StatsStrip` — a quiet parchment ledger strip rendered BELOW the stamps
  row (new stagger slot). One row of four at normal text; two-per-row at 130% (`useTextScale() >= 1.3`).
  One accessible summary label carries all four values.
- VoiceOver: the header's summary label already described exactly the surviving content (pct + discovered);
  the removed groups had separate labels which left with them. NextMilestone row unchanged
  (its `flex: 1` dropped since it no longer shares a row with the seal).

**Verification (executed):** `item2+4-catalog-combos-normal-FIXED.png` (header + strip + combos page),
`item2-catalog-top-130-FIXED.png` (130%: header airy, strip 2×2), `item2+4-catalog-combos-HC-FIXED.png`
(high contrast, seeded in-memory). Transcription test updated to the new sheet; suite green (below).

## Item 3 (feel) — rent-day presentation escalation

**Engine finding (read, then executed against):** rent deducts at the openShop where the PRE-open
`dueInDays === 1` (engine.ts sawtooth: decrement → 0 → deduct → reset to 3; `cascadeMountAfterOpenShop`
already keys `rentDue` off `beforeOpenShop.rent.dueInDays === 1`). So "rent-eve" (dueInDays 1) IS the payment
day; a `dueInDays 0` arrange-HUD never occurs in real play (my first payment-moment attempt seeded 0 and the
beat correctly did NOT fire — the premise check that found this).

**a) DuskAmbience final-day stage** (`src/juice/DuskAmbience.tsx`): dueInDays 1 wash `0.11 → 0.16`,
0 `0.16 → 0.22` (0 kept as defensive monotonicity), and a NEW ceiling dusk band (emberDark, top 18%) renders
only at `dueInDays ≤ 1` — the distinct stage, not just a number bump. Static views only; reduced-motion is a
non-issue by construction. **Executed:** `item3-renteve-hud-dueIn1-FIXED.png` vs `item3-control-hud-dueIn2.png`
— the notch is unmistakable (deep ember room + ceiling band vs pale wash).

**b) RentChip ember pulse** (`src/ui/components/RentChip.tsx` + `.styles.ts`): pulse period slowed 1.7s → 2.5s
(1250ms half-cycle, in the brief's 2–3s band); an `emberGlow` film (emberDark, themed) rides the SAME pulse
value as opacity `0 → 0.22` so the chip glows like a coal. Uniform scale + opacity only; `with*()` results
assigned straight to `.value` (Fabric scar respected). Reduced motion: film not rendered, pulse cancelled —
the chip is the static ember alarm tone (the brief's "static ember tint"). **Executed:** pulse visible live
on-sim during the rent-eve seed; end-state in the rent-eve shot. Reduced-motion path **inferred from code**
(a still cannot prove motion absence; the conditional is `alarm && !reduced`).

**c) Rent-payment beat** (`src/juice/cascade/CascadeLayer.tsx` + `src/app/run.tsx` + run styles):
CascadeLayer gains an optional `onDayTotal` callback fired exactly where the payout sting plays (terminal
event — play-through, skip, and replays all covered; omitted prop = zero change). run.tsx arms the beat only
when `cascadeMount.rentDue`, delayed by the existing `motion.cascade.rentThudDelayMs` so it lands WITH the
rent-thud haptic: the overlay's rent line (new `RentPaymentLine`) plays ONE heavier settle on the chip
(scale dip + 3px press-down, spring back — uniform) and a coins pill appears draining from pre-rent
(`coinsAfter + amount`) down to the real post-rent coins (CoinCounter `from`/`animate`; snaps under reduced
motion). No sim reads beyond existing state; no new sounds. **Executed:** full flow driven on-sim — seeded
dueInDays 1 arrange day (coins 30), tapped Open Shop, cascade slammed DAY TOTAL 17, beat fired: pill drained
47 → 22 (= 30 + 17 − 25 rent) beside the ember chip — `item3-payment-moment-drain-FIXED.png`.

**d) Rent-eve bed slot** (`src/juice/audio.ts` + run.tsx): new `MusicTrack` value **`rentEve`** in
`MUSIC_SOURCES`, PLACEHOLDER-pointed at `rent-week.mp3` (the discovery-jingle pattern) — when the Suno asset
lands, swap that ONE require for `rent-eve.mp3`; nothing else changes. run.tsx now picks `rentEve` at
`dueInDays === 1` and keeps `rentWeek` at ≤ 0 (defensive; audibly identical today since both point at the
same mp3). **Audio-prefs gate (inferred from code, structural):** `setMusicTrack` returns before any
`play()` when `usePrefs.getState().musicEnabled` is false and the live-toggle subscription pauses beds —
the rentEve slot sits behind the exact gate every other bed already uses; no new play sites were added, so
prefs-off ⇒ no sound calls. (No runnable audio-gateway test exists to extend — expo-audio doesn't load under
the node vitest env; same status as every prior bed.)

## Item 4 (Fable addition) — combos trophy medals read square

**Premise correction (executed disproof):** the medals were **never geometrically clipped**. A lime-probe
screenshot (well background temporarily `'lime'`) rendered a complete, round circle on the pre-fix layout at
normal AND 130%, and no `overflow: hidden` exists anywhere in the shelf subtree; the cell has no fixed
height. The square read was **contrast**: the well's `woodDark` ring (#6B4226) on the `shelfWood` bed
(#8A5A38) left the upper arc invisible — only the `woodLight` bottom lip drew, so the eye completed a
flat-bottomed square.

**Fix** (`src/app/catalog.tsx`, `ComboMedal`): the well's ring color `woodDark → shadow` (#4A2E17 — present
in both palettes), keeping the `woodLight` lit lower lip. The full circle now draws in locked and unlocked
states; shelf-band look otherwise untouched (no size/spacing changes needed — the geometry was fine).

**Verification (executed):** `item2+4-catalog-combos-normal-FIXED.png` + `item4-combos-locked-130-FIXED.png`
(locked, normal + 130%) + `item2+4-catalog-combos-HC-FIXED.png` (HC) + `item4-combos-unlocked+locked-normal-FIXED.png`
— the unlocked medal via an IN-MEMORY catalog seed (`achievedComboIds: ['wine-and-dine']`, `loadCatalog`
no-op'd for the session; nothing persisted — `recordRunEnd` is the only save path and was never called).
Current storage state has no achieved combo, so per the coordinator's rule no storage-based unlocked medal
was possible; the in-memory seed is the storage-safe equivalent.

---

## Verification summary

- `npx tsc --noEmit` — clean (**executed**, exit 0).
- `node --import tsx node_modules/vitest/vitest.mjs run --no-file-parallelism` — **57 files / 418 passed**,
  matching the 418 baseline run BEFORE any edits this session (**executed**, node v20.19.4-compatible raw
  invocation; pnpm broken per standing note).
- `node --import tsx scripts/validate-fixtures.ts` — 6 M0 fixtures + m2 validated, **untouched** (**executed**).
- Zero sim/contract/item/fixture changes: the diff touches only
  gallery/catalog/run screens+styles, DuskAmbience, RentChip, CascadeLayer (presentation prop), audio.ts,
  and the two transcription tests (`git diff --stat` in transcript — **executed**).
- Tests changed: `catalog.styles.test.ts` (journal decram + statsStrip transcription),
  `run.styles.test.ts` (cascadeRentLine row), `componentStyles.test.ts` (RentChip `emberGlow`). All are
  byte-identity transcriptions updated to the new sheets — they cover the changed styling path by
  construction (base palette byte-identity + HC thread-through).

## Open eyeball gates (human)

1. **Item 2 header feel** — decram accepted? (normal/130%/HC shots; the REQUEST CHANGES was taste-based.)
2. **Item 3 rent-eve feel** — is the deepened DuskAmbience + slow ember pulse "intense enough" IN MOTION?
   Stills can't carry a pulse; needs a live look at the dueInDays-1 day (and ideally the payment beat once
   on a real run). The 2.5s period / 0.22 film peak / settle weights are one-constant tweaks if it under- or
   over-shoots.
3. **Item 4 medal read** — do the circles read round ON DEVICE at arm's length (the fix is contrast, judged
   on a sim zoom)?
4. **Rent-eve Suno asset** — when it lands: swap the one `rentEve` require in `src/juice/audio.ts`.
5. **Payment-beat legibility** — the draining coins pill next to the rent chip: keep, or want a "− rent"
   caption on it? (Kept minimal per brief's "no new surfaces" spirit.)

## Incident note (environment, not code)

Metro's watchman watch on the repo had gone stale — edits were invisible to Fast Refresh AND cold reloads
(the bundle served pre-session code). Fixed by `watchman watch-del` + `watch-project` and restarting
`expo start --dev-client --clear` (now running in this session's background, port 8081). If the human's next
session sees stale bundles: same remedy.
