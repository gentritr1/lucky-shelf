# LUCKY SHELF — Kickoff Brief & Two-Lane Architecture

This project runs with three AI roles and a human relay:

- **Fable** — orchestrator, game director, balance owner, and reviewer. Owns the item table, economy tuning, and all fun/feel rulings. Reviews every milestone; nothing merges past an unreviewed milestone.
- **Codex — Lane A (Logic & Heavy Work).** Owns the simulation engine, scoring, economy, persistence, item system, test/fuzz harnesses, and app scaffolding.
- **Opus 4.8 — Lane B (UI & Presentation).** Owns the design system, every screen, all animation/juice, drag-and-drop feel, and Higgsfield asset integration. This game must look and feel top-tier for the genre; presentation is a primary product goal, not a skin.

Both implementers receive this entire brief. Your lane section defines what you own; the **Contract** (§4) defines the only surface where your work touches the other lane. Never edit files owned by the other lane. When you finish a milestone, post a **Review Packet** (§8) and stop.

---

## 1. The Game

**Lucky Shelf** is a cozy spatial roguelite for phones — portrait, one-handed, premium (no IAP/ads in MVP). You run a tiny shop. Each day a delivery arrives, you arrange items on your shelf, and when the shop opens, adjacency combos cascade into money. Rent comes due on a rising sawtooth. Where things sit is the entire game: it's Balatro's "numbers go wild" depth wearing the warm clothes of a shop-organization game — arranging cheese next to wine should feel *tidy* and then suddenly *broken* (in the good way).

**Pillars (Fable reviews against these — law):**
1. **Placement is the verb.** No hands, no spins. Skill = reading the grid and rearranging under constraint.
2. **Every coin is explained.** The scoring cascade animates item-by-item; a player can always answer "why did that pay out." Unreadable scoring is a review-blocker.
3. **Cozy outside, crunchy inside.** Warm, tactile, gentle — with an economy that rewards ruthless optimization.
4. **Sessions respect phones.** A run is 8–15 minutes, pausable anywhere, fully playable one-handed in portrait.
5. **Deterministic.** Seeded runs; replay = seed + decision list. Same seed + same decisions = same run, always.

### Core structures
- **Shelf:** starts as 3 shelf-rows × 4 slots (12 slots), expandable to 4×5 during a run via shelf upgrades. Adjacency = orthogonal: left/right neighbors on the same shelf-row, and the slot directly above/below on adjacent rows. (Diagonals don't count — keep the mental model simple.)
- **Day loop:** ① **Delivery** — draft 1 of 3 offered items (some days offer 2 picks). ② **Arrange** — place the new item and make up to **3 free moves** of existing items (extra moves cost coins; this constraint is the daily puzzle). ③ **Open Shop** — scoring pass resolves left→right, top→bottom; adjacency effects fire per the trace rules; day's earnings bank. ④ Optional **Restock Shop** every 3rd day: buy/sell items, buy shelf upgrades, reroll offers.
- **Rent (sawtooth):** due every 3 days, each rent ~35–45% higher than the last. Miss rent = run over. Run length is open-ended; surviving deeper rents is the score.
- **Run score:** total coins earned + deepest rent survived; end screen shows best combos of the run.

### Item system (the actual game)
Items are pure data: `{ id, name, tier, baseValue, tags[], rules[] }`. Rules are declarative adjacency effects the sim engine interprets — no per-item code. Rule vocabulary (MVP): `adjacentTo(tag|id) → +flat / +mult / ×mult`, `perAdjacent(...)`, `copiesNeighbor(direction)`, `auraRow(...)`, `auraColumn(...)`, `scoresLast`, `transformsAdjacent(after N days)`, `blocksSlot + shelfWideEffect`, `onSell(...)`, `growsEachDay(...)`.

**MVP pool: 36 items across 4 tiers.** Fable authors and owns the full table (delivered as JSON at M1); Codex implements the rule engine, never invents items. Twelve exemplars to build the engine against:
- **Wine Bottle** (t1, 4c) — +3c per adjacent Cheese
- **Cheese Wheel** (t1, 3c) — ages: +1c base per day survived
- **Mirror** (t2, 0c) — copies the scoring of its left neighbor
- **Shop Cat** (t2, 0c) — blocks its slot; ×1.5 to its entire shelf-row
- **Honey Jar** (t1, 2c) — adjacent items become `sticky` (immune to being moved) but get +4c
- **Price Gun** (t2, 1c) — +2c to every item in its column
- **Lucky Bamboo** (t1, 1c) — grows: every 3 days, upgrades one random adjacent item's tier
- **Antique Clock** (t3, 6c) — scores last; ×2 if nothing adjacent scored below 5c
- **Fishbowl** (t2, 3c) — +6c if it has no adjacent neighbors (loner)
- **Ice Box** (t2, 2c) — adjacent perishables (Cheese, Fish) can't age/expire; they get ×1.5
- **Vintage Radio** (t3, 5c) — the row's leftmost item scores twice
- **Coupon Stack** (t1, 1c) — −1c to itself per day, +5c to adjacent items on the day it hits 0 and vanishes
Design intent: tags (perishable, fragile, lucky, antique…) create cross-item grammar; several items reshape constraints (sticky, blockers, transforms) so the combo space doesn't exhaust — this is our answer to the genre's depth-ceiling risk.

### Meta layer (MVP scope)
- **The Catalog:** a collection album — every item discovered, every named combo achieved (Fable defines ~20 named combos, e.g. "Wine & Dine": 3 Cheese adjacent to 1 Wine), best-run stats. Permanent across runs. This is the collection meta.
- **Daily Shelf (stub at M5):** one seeded run per day, same item offers worldwide, one attempt, shareable score card.
- Explicitly out of scope for MVP: shelfkeeper characters, cloud sync, leaderboards, events.

---

## 2. Tech Stack (fixed)

- **Expo** (latest stable SDK), **TypeScript strict**, portrait-locked
- **@shopify/react-native-skia** — shelf scene, items, cascade effects, particles
- **react-native-reanimated** + **react-native-gesture-handler** — drag-and-drop, all motion
- **zustand** — run/meta state; **zod** — item table, save files, contracts validation
- **expo-haptics** — placement tick, cascade pulses (escalating with combo size), rent-day thud
- **AsyncStorage or expo-sqlite** for Catalog/persistence (Codex justifies choice in M0; save schema versioned)
- Sound hooks via expo-audio, placeholder-first

---

## 3. Repository Layout & Ownership

```
/src/contracts    — shared types + zod schemas (CO-OWNED: changes need Fable sign-off)
/src/sim          — Lane A. Pure TS. Grid, rule engine, scoring, economy, RNG, replay. ZERO React/RN/Skia imports
/src/items        — Fable-authored items.json + named combos (Lane A validates/loads)
/src/persistence  — Lane A. Saves, catalog storage, migrations
/src/app          — Lane A scaffolds (navigation shell, state wiring); Lane B populates screens
/src/ui           — Lane B. Design system, screens, components
/src/juice        — Lane B. Skia scenes, cascade animation, particles, haptic/sound choreography
/fixtures         — shared: fixture runs, golden scoring traces, mock states for UI dev
```
- `/src/sim` and `/src/items` must run under plain Node for tests and Fable's balance sims.
- Lane B never imports from `/src/sim` internals — only `/src/contracts` types and the state store selectors Lane A exposes.
- Lane A never styles anything beyond dev/debug screens.

---

## 4. The Contract (the seam between lanes — most important section)

Defined in `/src/contracts` at M0, frozen except by Fable-approved change. Three surfaces:

**1. `GameState`** — serializable snapshot: shelf grid (slots → item instances with per-instance state like age/growth), coins, day, next rent {amount, dueInDays}, current offers, moves remaining, run stats, catalog deltas.

**2. `Action`** — the only way UI mutates the game: `draftItem(offerIndex)`, `placeItem(slot)`, `moveItem(from,to)`, `sellItem(slot)`, `openShop()`, `buyOffer(i)`, `reroll()`, `endRestock()`, `abandonRun()`. Lane A exposes `dispatch(action): GameState`; sim validates and returns the new state. UI never computes rules.

**3. `ScoringTrace`** — **the crown jewel.** When `openShop()` resolves, the sim emits an ordered event list describing exactly what happened, in resolution order:
```ts
type TraceEvent =
  | { kind:'itemBase';    slot:Slot; value:number }
  | { kind:'ruleFire';    sourceSlot:Slot; targetSlot:Slot; ruleId:string; delta:{flat?:number; mult?:number}; runningTotal:number }
  | { kind:'comboNamed';  comboId:string; slots:Slot[] }
  | { kind:'rowAura';     sourceSlot:Slot; row:number; mult:number }
  | { kind:'itemTotal';   slot:Slot; total:number }
  | { kind:'dayTotal';    coins:number }
  | { kind:'transform';   slot:Slot; fromItem:string; toItem:string }
```
Lane B animates the trace verbatim — one event at a time, arrows from source to target, count-ups, escalating haptics. This single structure is how we guarantee Pillar 2 (every coin explained): if the UI can't animate it from the trace, the trace is wrong, and that's a Lane A bug. Golden traces for fixture shelves live in `/fixtures` and are snapshot-tested; Lane B builds all cascade animation against those fixtures long before integration.

---

## 5. Lane A — Codex (Logic & Heavy Work)

You own: rule engine, scoring resolution (deterministic order: slots left→right top→bottom; within a slot: base → flat adds → mults; `scoresLast` items deferred; document any ordering decision in the trace), economy math, rent curve, offer generation (seeded, tier-weighted by day), item instance state (aging, growth, timers), persistence + migrations, replay (`{seed, actions[]}` → identical run), navigation/state scaffolding, and the **fuzz harness**: headless runner playing thousands of seeded runs with strategy bots (greedy, random, combo-seeking) outputting economy stats — Fable uses this to tune the item table and rent curve, so make it a first-class CLI (`npm run fuzz -- --runs 5000 --strategy greedy`), JSON stats out.

Quality bars: determinism suite (fixed seed + action list → exact state hash; 200 random-action replays hashed twice, identical), rule-engine unit tests per rule primitive, golden ScoringTraces for 6 fixture shelves, zero allocations from sim in steady state per frame (sim only runs on actions anyway — keep it synchronous and fast, full openShop() resolution < 16ms on device).

## 6. Lane B — Opus 4.8 (UI & Presentation)

You own the product's soul. Targets: this should be **the best-feeling game in its genre on a phone** — Balatro-tier tactility. Specifically:
- **Design system first** (M1): tokens (spacing, type scale, radii, shadows, motion durations/easings), warm palette (§7), component kit (buttons, cards, panels, coin counter, offer cards). Everything themed from tokens so the Higgsfield art pass reskins without rework.
- **Shelf scene** (Skia): the shelf is the hero. Items sit with subtle depth, idle micro-motion (Cheese breathes, Cat's tail flicks — 60fps, cheap), slots glow legal/illegal during drag.
- **Drag-and-drop feel:** grab = item lifts with scale+shadow, neighbors part slightly, drop = settle bounce + haptic tick, invalid = soft rubber-band return. This interaction alone should feel worth the download.
- **Cascade animation:** consume ScoringTrace events sequentially — source→target arrows/sparks, per-item count-ups, named-combo banner moments, escalating haptic+pitch as runningTotal climbs, final dayTotal slam. User-adjustable speed (1×/2×/skip). Build against `/fixtures` golden traces from day one.
- **Screens:** title, run HUD (day, coins, rent countdown — rent proximity must be *felt*, the room warms/dims as rent nears), delivery draft, restock shop, run summary (best combos replayable as mini-traces), Catalog album (this is the meta — make discovery feel like collecting stamps), settings, daily shelf card (M5).
- **Accessibility:** one-handed reach map (primary actions in bottom 60%), reduced-motion mode, colorblind-safe rule-arrow palette, min touch targets 44pt.

You receive mock GameStates and golden traces at M0 — you never wait on Lane A to build.

---

## 7. Art Direction + Higgsfield Pipeline

**Style: "Golden Hour General Store."** Storybook-cozy gouache: warm wood shelf against honeyed late-afternoon light, soft paper-grain texture, items as chunky hand-painted miniatures with gentle rim light, slight naive-illustration wobble to lines. Palette anchors: shelf wood #8A5A38, wall cream #F4E8D3, sunlight #FFD9A0, accent teal #3E8E7E, coin gold #F5B942, rent-warning ember #D9603B. Mood references: Stardew-meets-Ghibli-pantry. No casino iconography anywhere.

**Asset list (transparent PNGs, 3x; item sprites must read at ~64pt slots):**
- 36 item sprites + tiered variants where rules imply them (Cheese age stages ×3, Bamboo growth ×3, Coupon countdown ×2, Vault-style Antiques ×1 each)
- Shelf frame set (3-row and 4-row), wall backdrop day/dusk variants, shop-front title scene
- Named-combo badge frames (×20), Catalog stamp frame, coin, moving-hand cursor sparkle
- UI texture kit for Lane B: paper panel, wood button, ribbon banner (9-slice friendly)
- Key art (1024×1536) + app icon (the Shop Cat on a shelf — it's the mascot)

**Higgsfield prompt template (human runs; manifest names must match):**
> "Cozy storybook game sprite, [ITEM], hand-painted gouache texture, chunky miniature proportions, warm golden-hour lighting from upper left, soft rim light, muted warm palette, thick simple shapes readable at small size, no text, no background (transparent), centered"

Generate the **Shop Cat first** as the style reference element; all other items generate against it. Consistency check: any 6 random sprites side-by-side must look like one artist's set. Fable rejects sprites that break slot readability; placeholders win until art is right.

---

## 8. Working Agreement

**Review Packet (each lane posts its own at every milestone, then stops):**
1. Built vs. milestone criteria, bullet-for-bullet
2. Exact test/run commands + manual script (Lane B: which fixture states/traces to load)
3. Test/fuzz/determinism output pasted (Lane A) / screen recordings requested with shot list (Lane B)
4. Known issues + spec deviations (empty list is suspicious)
5. Questions for Fable — never silently resolve ambiguity; state assumption, ask
6. **Contract change requests**, if any — the only cross-lane escalation path

**Standing rules:** contract changes, scoring-order changes, and item-table changes go through Fable. Fun/feel rulings are Fable's. Lane A: boring correct code; Lane B: spend your cleverness on motion, not architecture. Commits reference milestone+lane (`A-M1: mirror rule + trace events`).

---

## 9. Milestones

### M0 — Contracts & Scaffolding (both lanes + Fable, ~small)
- A: repo, Expo boot, `/src/contracts` (GameState/Action/TraceEvent + zod), 6 fixture GameStates + 6 hand-written golden traces, persistence choice justified
- B: design tokens draft, component inventory, one polished throwaway screen proving the token system on device
**Accept:** contracts compile both lanes' stubs; fixtures load; Fable signs the contract freeze.

### M1 — Engine ∥ Design System
- A: full rule engine (all primitives), scoring resolution + real trace emission matching goldens, determinism suite green, exemplar-12 items live, fuzz harness v1 running headless
- B: design system complete, shelf scene with static fixture items + idle motion, drag-and-drop feel complete against mock state, title + HUD shells
**Accept:** A — goldens + fuzz stats delivered to Fable (who now authors the full 36-item table against the engine). B — Fable reviews a recording of drag-drop and idle motion; "would you keep touching it for no reason" is the bar.

### M2 — Full Run ∥ Cascade
- A: full day loop (draft/arrange/openShop/restock), rent sawtooth, 36-item table integrated, offer generation, replay, saves
- B: cascade animation consuming golden traces end-to-end (arrows, count-ups, combo banners, haptic/sound choreography, speed control), draft + restock screens
**Accept:** A — a headless bot completes full runs; Fable fuzz-reviews for degenerate combos (infinite/dominant strategies get item-table patches). B — Fable can follow every coin in a recorded cascade without pausing.

### M3 — Integration & Fun Gate
- Lanes merge: real sim drives real UI. Full run playable on device, 60fps, haptics/sound placeholder-complete
- Tuning loop: Fable plays via human recordings + fuzz stats, issues item/rent patches; A applies data patches, B fixes readability findings
**Accept:** Fable's fun gate — a full run is genuinely moreish with placeholder art, rent tension lands, and no strategy from the fuzz bots beats variance by >2× the median.

### M4 — Catalog & Higgsfield Art
- A: catalog persistence, named-combo detection (emits `comboNamed` trace events), stat tracking
- B: Catalog album screen, art integration from the Higgsfield pack via manifest (tokens make this a reskin), dusk/rent-warning ambience shift
**Accept:** 60fps holds with full art; slot readability regressions = blocker; catalog discovery moment reviewed for delight.

### M5 — Release Candidate
- A: daily shelf (seeded from date, one attempt enforced, local), share-card data, EAS profiles
- B: daily shelf share card (the social artifact — design it to be screenshot-worthy), onboarding (one gif-like animated hint, no tutorial text walls), settings, icon/splash, store screenshot list
**Accept:** Fable cold-start review: install → first run unaided → catalog stamp earned → daily shelf played → share card exported.

---

**First action, Lane A:** confirm understanding, list ambiguities, propose contract type definitions in full + persistence choice, then begin M0.
**First action, Lane B:** confirm understanding, list ambiguities, propose the token system (values, not vibes) and the drag-and-drop motion spec (durations/easings/haptic map), then begin M0.
