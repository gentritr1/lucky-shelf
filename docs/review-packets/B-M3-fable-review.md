# Fable Review — B-M3 (Integration Polish)

**Verdict: ACCEPTED** (2026-07-07). The seams are gone. M3 — the merge milestone — is
**closed for both lanes**: real sim drives real UI, and the integrated build reads as one
game. Next is the fun gate (below), which is partly satisfiable now and partly waiting on
the one device recording.

## Verified independently on web (runtime values, not packet-trust)

- Gates: tsc strict clean; **51/51 tests**; `auraGold`/`auraGoldEdge` tokens present;
  36 glyph entries.
- **R-33 aura → gold:** golden 4 band computed `rgb(255,217,160)`, **zero teal elements
  on the page**, ×1.5 label crisp, wine 12 / honey 3 both explained under the lit band,
  day total 15. The olive-over-wood problem is gone.
- **R-36 completion beat:** at `dayTotal` the transport (1×/2×/skip) **retires** and a
  single **`Collect ▸`** affordance appears. One advance, owned by the layer. Confirmed
  live.
- **R-34 banner dock:** golden 2 — the "Wine And Dine" banner docks to the top-right at
  full opacity (not ghost-pale, not fading in place); day total counts up and lands on
  **22** (caught it mid-tween at 19 — the count-up works).
- **R-38 glyphs:** real emoji across the full table (Tea Tin 🍵, Chocolate 🍫, Bread 🍞
  seen live); no 📦 fallback in play.

## Device-verify-only (accepted, not a gap in the work)

`react-native-gesture-handler` cannot activate a Pan from web input (synthetic OR
trusted) — the documented standing constraint. So the **tray drop** and, because
placement gates Open Shop, the **run.tsx overlay end-to-end** are device-only. The
overlay *content* is fully web-verified via the harness (identical `CascadeLayer`); what
remains is the run.tsx wrapping (scrim, snapshot header, Collect-routes) and the drop
feel. Correctly placed on the §5 shot list. Haptics device-only as always.

## Rulings on §6 questions

- **R-42 (skip semantics — you read it right):** Skip **jumps to the done-state, lands
  the slam, reveals `Collect ▸`; the tap routes.** Keep it. This is the correct reading
  of R-39, and better than the literal one: it gives **one** completion behavior (always
  Cash-Out-gated), and it means skipping the *animation* never means skipping *knowing
  your result*. Skip = "stop animating, show me the total," not "leave without the
  payoff." Good instinct surfacing the divergence instead of silently picking. My R-39
  wording ("immediately on skip") was imprecise; R-42 supersedes that clause.
- **R-43 (scrim vs opaque):** **Scrim, not opaque — this one is non-negotiable, not a
  preference.** The cascade animates arrows source→target *on the shelf slots*; an opaque
  panel would hide the board and break Pillar 2 (you must see the items being explained).
  `ink @ 0.55` is a fine floor. For the device pass: try a **warm-tinted** scrim (toward
  wood/ember rather than neutral ink) so the overlay stays in the Golden-Hour world — it
  also rhymes with the M4 dusk/rent-ambience dim. Pick the exact value by feel on device.

## M3 is closed

A-M0…M3 ✅ · B-M0…M3 ✅. Contract frozen at M0 held through the entire merge with zero
CCRs. Two lanes built independently against fixtures and met with the seam intact — that
was the bet of the whole structure, and it paid.

## The fun gate — how I'll run it

The kickoff gates M3 on *"a full run is genuinely moreish with placeholder art, rent
tension lands, and no fuzz strategy beats variance by >2× median."* Splitting it by what's
assessable now vs. on the recording:

- **Passable now (structure + economy):** fuzz degenerate check passes on the integrated
  build (greedy vs combo both median rent-7, no >2× dominance). Playing the real loop on
  web, the draft→arrange→cascade→rent tension is legible and the "why did that pay" is
  always answerable — Pillar 2 holds in the integrated build. Rent sawtooth creates real
  pressure by cycle 4+.
- **Waiting on the one device recording (feel):** the tactile half — drag/settle, tray
  placement, cascade haptic ladder, the Collect beat timing, reduced-motion feel. This is
  the §5 shot list (folds B-M1 feel + B-M2 haptics + M3 overlay/tray). *"Would you keep
  touching it for no reason"* is a device judgement; I won't sign the fun gate on web
  stills.

**So:** M3 build is accepted and complete. The **fun gate is one artifact away** — the
consolidated device recording. When it lands I run the gate; any tuning falls out as item
table / economy data patches (Lane A) and readability fixes (Lane B), per the kickoff's
M3 tuning loop. If it clears, M4 (Catalog + Higgsfield art) opens.

## Immediately after the fun gate

- Promote from `docs/product-moat-suggestions.md`? At M4 I'll skim it — S-13 (combos as
  language) and S-14 (catalog completion identity) are natural M4 companions since the
  Catalog screen lands then. Not now; flagging the pointer.
