# Lucky Shelf — gameplay and intuitiveness audit

**Date:** 2026-07-12  
**Branch audited:** `graduation-flip` at `ec34c4e`, plus the uncommitted fixes listed below  
**Scope:** game feel, comprehension, simulation, economy evidence, persistence safety, motion, accessibility, and release sequencing

## 1. Overall verdict

Lucky Shelf has a strong and differentiated game at its center. “Place objects on a tiny shelf, then watch every relationship pay out” is tactile, memorable, and easy to pitch. Deterministic state, action logs, `ScoringTrace`, seeded dailies, build identities, and variety-not-power unlocks are unusually coherent foundations for a mobile strategy game.

The main playability risk is **not insufficient depth**. It is asking players to make strategic choices before the interface has explained the consequences of those choices. Before this pass, ordinary delivery and shop offers showed value and tags but not the item rule. The player had to memorize the Catalog before drafting intelligently.

The second risk is evidence quality. The release balance gate said the build swing was green, but it compared `allDepth` to baseline even though `allDepth` omits shelf expansion, unlocks, and the day-2 starter. A first correction still mixed the 16-item starter pool with the full baseline pool. The final harness compares like-for-like starter and full cohorts, pairs every seed, and reports both ratio-of-medians and per-seed lift distributions. Both cohorts remain out of band, reopening the economy gate.

## 2. Research synthesis

The research agents compared Lucky Shelf with Balatro, Luck Be a Landlord, Backpack Battles, Backpack Hero, Stacklands, Slice & Dice, and Suika Game, and checked platform/game-UX guidance.

The consistent lesson is:

1. Teach one concrete verb before the vocabulary around it.
2. Show the information needed for a choice at the moment of choice.
3. Let uncertainty come from combinations and opportunity, not hidden rules.
4. Give feedback a causal grammar: action → affected object → result.
5. Add replayability through varied situations and mastery, not permanent power or pressure.

Relevant sources:

- [Apple: onboarding for games](https://developer.apple.com/app-store/onboarding-for-games/)
- [Apple: game controls](https://developer.apple.com/design/human-interface-guidelines/game-controls)
- [Apple: playing haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)
- [Balatro official store page](https://store.steampowered.com/app/2379780/Balatro/)
- [Backpack Battles official store page](https://store.steampowered.com/app/2427700/Backpack_Battles/)
- [Stacklands official store page](https://store.steampowered.com/app/1948280/Stacklands/)
- [Ryan, Rigby, and Przybylski: autonomy, competence, and enjoyment](https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf)

## 3. Changes implemented in this pass

### Decision comprehension

- Delivery now shows up to two exact plain-language rule lines for the selected offer.
- Daily Shop rows now show complete exact rule prose and retain the two leading build tags. The stock list scrolls instead of truncating semantics under larger text.
- Both surfaces reuse the tested `describeItemRules` interpreter through the state/view-model boundary; no item values, rule semantics, contracts, or scoring changed.
- Signature items retain their shorter run-defining blurb.

### Save safety and title correctness

- Autosaves are serialized. A slow old write can no longer finish after and overwrite a newer action.
- Only the newest requested save controls `saveStatus` and `lastSaveError`.
- Failed saves surface a global, accessible “Progress not saved · Retry” banner.
- Continue waits for queued writes before loading.
- A load-generation guard prevents a slow Continue read from replacing a run started while it was pending.
- Read failures leave an explicit retry state instead of silently hanging in Loading.
- Continue is hidden when there is no resumable save.
- Corrupt/version-mismatched saves explain that they could not be restored.
- New Run and an unplayed Daily warn before replacing a resumable run.
- Clearing the active run is queued behind pending saves so an earlier write cannot recreate a cleared save.

### Truthful simulation evidence

- Baseline and depth configurations now use paired seeds and explicit starter/full unlock cohorts.
- Build swing compares `baselineStarter`→`graduating` and `baselineFull`→`graduatingFull`.
- The approved gate remains a ratio of medians; a report-only per-seed ratio distribution now exposes paired variance.
- Liveness uses the canonical `BALANCE_FLAG_CONFIGS`, including unlocks and the true shipping world; absent flags are force-OFF rather than falling through to compiled defaults.
- A focused test pins the compiled shipping defaults to the graduating configuration and pins warm opening OFF.
- Ordinary balance tests use representative, bounded work. The full 80-run report remains the authoritative release gate.
- Balance output and violations now name the graduating comparison honestly.

### Report-only playability evidence

- `scripts/fuzz.ts` now reports observational decision-depth proxies: move, sell, buy, reroll, and expansion actions per run; moves per scored day; zero-sell and full-shelf run rates; distinct final items; per-item and per-combo run presence; and outcomes grouped by chosen supplier.
- These metrics are explicitly labeled proxies. They do not infer player intent, add new strategy policies, or create release bands.
- A smoke sample confirmed the existing greedy ceiling bot commonly fills the shelf while never selling and rarely rearranging. This motivates human testing of replacement value and move comprehension; it does not justify a rule change by itself.

### Scoring comprehension close-out

- Every cascade step now displays a compact sentence derived from the reviewed receipt model: source item → affected item → rule delta → new total.
- The sentence is synchronized to `useCascadePlayer.stepIndex`, uses the same frozen `ScoringTrace`, and is announced through a polite accessibility live region. It introduces no second timer or scoring logic.
- When the cascade finishes, “Review scoring receipt” replaces the shelf with the complete scrollable receipt. It is inline rather than modal, keeps Collect available, and can return to the scored shelf.
- Receipt review is only offered after `player.done`, so it cannot compete with apex spectacle. Reduced motion snaps the causal caption; receipt content is immediately complete.
- A pure `receiptCaptionForStep` model pins causal wording and preserves the last meaningful caption across receipt-silent `itemTotal` steps.

### Shelf recall, accessible movement, and feedback timing

- Tapping or VoiceOver-activating a shelf or delivery-tray item opens its exact tested rule prose,
  location, and value. Sticky items remain inspectable and explicitly explain that they cannot move.
- A selected movable item exposes each legal empty slot as a labeled 44pt action. Activating a slot
  dispatches the existing `moveItem`/`placeItem` contract action; the drag path and legality rules are
  unchanged.
- Shelf and tray items expose accessible name/location/value labels and selected state; the HUD now
  announces the exact free-move count. The current cascade cause was already made a polite live region.
- Normal secondary copy now clears AA: `inkFaint` measures 5.24:1 on the wall and 4.76:1 on
  parchment. High-contrast secondary pairs remain AAA.
- Placement impact now fires at release and the selection tick at rest. Payout audio fires when the
  terminal `dayTotal` resolves (including Skip/replay), not on Open Shop. Rent thud follows on a
  separate beat. The missing dedicated discovery-jingle asset remains an explicit audio gate.

### Contextual first-run teaching

- Replaced the blocking, all-systems Arrange welcome wall with four short notes beside the real action:
  supplier direction, comparing a selected item rule, placing the first item, and following the first
  scoring cause. Later systems stay out of the copy until they are actionable.
- Progress comes from authoritative route/game state, moves forward only, persists between launches,
  reconciles resumed or feature-off runs, and can be skipped at every card. There is no tutorial-only
  simulation or gameplay branch.
- Supplier and draft content now scroll rather than clipping when the inline note or large text needs
  more room. Changing the number/timing of supplier choices remains a Fable gameplay ruling.

## 4. Verification

### Automated

```text
tsc --noEmit: clean

Focused new-surface runs:
Receipt/player  5 files, 37 tests passed
Inspector/state 3 files, 21 tests passed

Full serial suite:
Test Files  53 passed (53)
Tests       373 passed (373)
Duration    53.22s

Fixtures: 7/7 valid
```

The earlier parallel full run produced eight timeouts. The same deterministic files passed in isolation, and the complete serial run is green. Those were runner-contention failures, not semantic nondeterminism.

### Device

- Current branch rebuilt and installed successfully on an iPhone 16 Pro / iOS 18.6 simulator after the final UI changes.
- Title screen rendered without the archived black-region capture defect and resolved the saved-run state to Continue.
- Daily Shop was visually checked with four offers. Each row fit its complete rule semantics plus tags without clipping, while the bottom action stayed in reach.
- Apex scoring was checked after the slam: the causal card fits beneath the shelf and states the final result without hiding spectacle.
- The completed ten-line Wine & Dine receipt fits without clipping, scrolls independently, and keeps Back to shelf + Collect as separate 44pt actions.
- The same caption/receipt surface passed at 130% text, high contrast, and reduced motion. Simulator preferences were restored after QA.
- The shelf inspector was rendered from the restored active run on iPhone 16 Pro: selected-ring,
  exact Wine Bottle rule, row/column, value, movement hint, and close control all fit without covering
  the shelf. The headless host could not inject a reliable tap, so physical tap/VoiceOver activation
  stays in Gate 2; the selector/action paths are covered headlessly.

### Corrected balance gate — **FAIL / requires Fable**

Authoritative paired command:

```sh
node --import tsx scripts/balance.ts \
  --runs 80 \
  --config baselineStarter,baselineFull,graduating,graduatingFull \
  --policy ceiling-greedy,ceiling-combo \
  --assert-bands
```

```text
starter greedy:  baseline 2,006 → graduating 5,286 = 2.635×
starter combo:   baseline 2,006 → graduating 5,442 = 2.713×
full greedy:     baseline 2,066 → graduating 4,645 = 2.248×
full combo:      baseline 1,993 → graduating 4,816 = 2.416×

per-seed paired median ratios:
starter greedy 2.587× (p10 1.350, p90 4.233)
starter combo  2.539× (p10 1.729, p90 3.381)
full greedy    2.181× (p10 0.914, p90 3.189)
full combo     2.227× (p10 0.665, p90 4.521)

approved swing band: [1.3×, 2.0×]
```

The run-length band still passes. All four build-swing arms fail. The wide paired distributions also show that supplier/offers materially change outcomes, so the retune should be validated across cohorts and seeds rather than around one headline. No economy constants, item values, multipliers, scoring order, or approved bands were changed in this pass.

## 5. What is already strong

- Direct shelf manipulation with lift, 1:1 drag, legal/illegal shape cues, sticky resistance, and reduced-motion behavior.
- One survival spine: rent gives each run legible pressure.
- `ScoringTrace` makes every coin deterministic and auditable.
- Build steering, tag identity, signature stock, goals, shelf expansion, unlocks, Catalog, and Daily provide enough breadth for alpha.
- The title, shelf art, gouache items, receipt language, and cozy sound direction form a distinctive identity.
- The simulation protects determinism, golden traces, schema validity, liveness, daily comparability, and signature dominance.

## 6. Remaining priority risks

### P1 — Fable balance ruling

The corrected like-for-like evidence exceeds the approved depth-swing ceiling for fresh and fully unlocked players. Fable must choose a coherent retune. Do not widen the band to make the gate green. Candidate levers remain the already-documented economy package: multiplier stack, late rent, recurring spatial coin sinks, and/or bot-policy interpretation. Re-run both cohorts after any ruling.

### P1 — supplier opening decision (Fable ruling)

The contextual supplier → draft → place → Open sequence is implemented without changing game logic.
The graduated run still begins with a mandatory choice among ten archetypes before the player has
handled normal stock. If cold tests still hesitate here, reducing or delaying that choice is a gameplay
ruling and needs Fable; presentation should not silently change it.

### P1 — residual physical accessibility validation (human Gate 2)

Implemented: shelf/tray rule inspection, tap-item → tap-slot movement, item/slot/legal-action labels,
numeric moves-remaining announcement, current scoring-event live region, and cascade large-text/high-
contrast coverage, and normal-mode AA secondary copy. Remaining: run the complete physical VoiceOver
focus/action sequence on shelf and delivery tray.

### P2 — remaining audio asset and feel validation (Lane B)

Drop/settle, payout, and rent timing are now event-aligned. Remaining:

- Replace the reused payout sting with the already-specified warm discovery jingle.
- In the Gate 2 ears-and-hands pass, confirm the 220ms rent consequence beat and decide whether
  repetitive rule-fire haptics should become lighter/silent once learned.

### P2 — human-like simulation (Lane A, report-only foundation complete)

Current ceiling bots are one-ply and do not churn weak late-game stock. The neutral report foundation is now present. If Fable asks for policy envelopes, add bounded-information probes without changing rules:

- novice: base value + visible tags;
- learner: discovered rule prose + qualitative hints + one-ply search;
- churn builder: sells the lowest marginal item for a replacement;
- short multi-move planner;
- supplier-pinned archetype policies.

The current report already covers action counts, shelf/item/combo concentration, and supplier-observed outcomes. Future policies may add placement breadth/regret, unused wealth, trace length, and estimated animation time. Do not create blocking bands until Fable approves them.

## 7. Execution plan from here

1. **Fable economy review:** rule on the corrected 2.248–2.713× cohort swings; retune; re-run pins, fixtures, full suite, fuzz, and paired balance gate.
2. **Lane B comprehension close-out:** contextual first actions, shelf inspector, screen-reader move
   path, current-cause caption, and expandable receipt are implemented; run the cold path in Gate 2.
3. **Lane B accessibility/feel pass:** physical VoiceOver validation and a distinct
   discovery-jingle asset. Event-aligned placement/payout/rent timing is implemented for Gate 2 review.
4. **Human Gate 2:** run the consolidated SE/4×4/reduced-motion/high-contrast/apex-cascade/drag-feel batch on the retuned graduating build.
5. **External alpha:** about ten named email-invite players over three days. Use TestFlight's sessions, crashes, screenshot feedback, and comments; do not add a custom analytics/crash SDK for this sample. Capture time-to-first-placement, first-rent result, session length, run-two conversion, 1×/2×/skip use, and observed confusion in the explicit playtest sheet/feedback.
6. **Comprehension prompts:** after draft (“why this item?”), before first Open (“what do you expect?”), after cascade (“which placement mattered most?”), and on day 3 (“what shelf are you building?”).
7. **Evidence-led tuning only:** welcome-week rent, a clearer run endpoint, ghosts, combo cinema, or rewind are pulled only when alpha behavior supports the corresponding problem.

Before upload, the human must supply the privacy-policy URL, feedback email, signing/App Store Connect access, and tester list. Generate Xcode's privacy report from the release archive and check every bundled SDK manifest. Apple treats data processed only on-device as not collected for the App Privacy label; transmitted gameplay/interaction data would change that answer. External TestFlight testing requires beta information and review, and builds expire after 90 days.

Official alpha/privacy references:

- [Apple App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [Apple privacy manifest reports](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
- [Apple TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Apple tester feedback](https://developer.apple.com/help/app-store-connect/test-a-beta-version/view-tester-feedback/)
- [Apple app privacy management](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)

Directional cold-test bars for the alpha packet (not scientific or blocking bands): 8/10 place unaided, 7/10 explain one payout, 6/10 name a build intention, and median session length inside the stated 8–15 minute promise.

## 8. Ownership and stop line

Files touched across the Lane B surface were limited to decision-time presentation and its style tests:

- `src/app/_layout.tsx`
- `src/app/index.tsx`
- `src/app/draft.tsx`
- `src/app/restock.tsx`
- `src/screen-styles/_layout.styles*`
- `src/screen-styles/index.styles*`
- `src/screen-styles/draft.styles*`
- `src/screen-styles/restock.styles*`
- `src/sim/balanceHarness*`
- `src/sim/decisionDepth*`
- `scripts/balance.ts`
- `scripts/fuzz.ts`
- `src/state/store*`
- `src/state/onboardingStore*`
- `src/juice/cascade/CascadeLayer.tsx`
- `src/juice/cascade/useCascadePlayer.ts`
- `src/juice/DraggableItem.tsx`
- `src/juice/DeliveryTrayItem.tsx`
- `src/juice/ShelfScene.tsx`
- `src/juice/receipt/caption*`
- `src/juice/receipt/index.ts`
- `src/screen-styles/run.styles*`
- `src/ui/components/MovesPips.tsx`
- `src/ui/OnboardingHint*`
- `src/ui/tokens.ts`

`placementHints` was evaluated but **not wired**. The A-M8 handoff explicitly assigns that UI surface to Lane B behind `PLACEMENT_HINT_ENABLED`; that gate does not exist yet. No `src/contracts`, `src/items`, scoring-order, or item-table changes were made.

**Stop:** the corrected two-cohort balance failure requires Fable. Physical onboarding/VoiceOver/feel
validation and the distinct discovery-jingle asset remain Lane B/
human gates. TestFlight submission additionally requires the human-owned privacy URL, feedback email,
signing roles, and tester list.
