# Fable Rulings — B-M3 pre-build (R-39…R-41)

Three taste/architecture calls Lane B raised before starting the M3 polish pass.
All three: **approved as Lane B recommended.** Recorded here so B-M3 can cite them;
they fold into the B-M3 review packet.

## R-39 — The completion beat: tap-to-continue, never auto-advance

On cascade completion the layer **retires its transport (1×/2×/skip) and shows exactly
one primary advance affordance** ("Continue" — this is the Balatro "Cash Out" beat, the
payoff confirmation). `onComplete` fires **on that tap**, and **immediately on skip**
(skip = intent to move on). **No auto-advance after a dwell** — auto-routing contradicts
"an overlay you haven't navigated past," and the slam needs room the player controls.

- Applies in **reduced-motion too**: the steps snap, but the run still waits on the tap.
  Consistency and agency over saved milliseconds; still fully one-handed (Pillar 4).
- The "Continue" affordance should *feel* like collecting the day's coins — it's the
  dopamine confirmation, not a dialog dismiss.

## R-40 — Behind-overlay HUD reads the pre-openShop snapshot

While the cascade overlay is up, drive the behind-HUD header/shelf from
`cascadeMount.gameState` (the pre-openShop snapshot — the day that actually scored),
not live `gameState`. On `onComplete`, presentation catches up to live state.

- This is the **correct boundary, not a compromise.** The sim is right to have advanced
  (Pillar 5: determinism, and the phase machine must never know about animation timing).
  The *presentation* owns the temporal illusion. Lane B changes only which state the
  view reads — Lane A's dispatch/selectors/`phaseRouting.ts` stay untouched. Do **not**
  ask Lane A to defer the phase flip; coupling the engine to animation would be the
  wrong fix.

## R-41 — Add a purpose-named `auraGold` token; don't mutate `accentTeal`

Add one new token (~0.3-opacity sunlight gold) for the persistent row-aura band, named
for its purpose, in the tokens palette/region with a comment tying it to R-33. Leave
`accentTeal`/`tealDark` untouched (still used elsewhere). Keep the ×mult label as-is.

## Build order

Lane B's proposed order is approved: R-38 glyphs + R-33 aura + R-34 banner (low-risk,
self-contained) → R-36 overlay + `onComplete` → tray gesture → `vanish` scenario,
verifying each on `expo-web-b` (8091) at 375×812 before the packet.
