# Product Moat — Suggestions Ledger (post-MVP, NOT commitments)

Status: **suggestions only.** Nothing here is scheduled. Fable's framing from the
M1-era strategy discussion (2026-07-06): the grid is cloneable in a weekend — keep the
value where a fast-follow clone structurally can't reach. Revisit this file at every
milestone review and after MVP ship; promote items individually, with fuzz/feel gates
like everything else.

## Moat 1 — The trace is the moat, not the grid

Everything below exists because runs are `{seed, actions[]}` (tiny, deterministic) and
scoring emits an animatable ScoringTrace. Clones that skipped determinism cannot follow.

- **S-1 Combo cinema.** Share any run/day as a deep link / QR (~hundreds of bytes);
  recipient's phone replays the cascade cinematically. The social artifact is the
  *animation*, not a screenshot. (Foundation: replay runner + CascadeLayer, both M2.)
- **S-2 Puzzle mode.** A puzzle = GameState JSON + goal ("38 coins in 2 moves").
  Community-authored shelves = UGC with zero server infra; solutions are action lists,
  validated by replay. (Foundation: contract-parsed states + dispatcher legality.)
- **S-3 Ghost dailies.** Daily shelf (M5) + asynchronous ghosts: see how a friend
  arranged the identical delivery, decision by decision. Leaderboards submit decision
  lists and are verified by replay — cheat-proof by construction, no anti-cheat team.
- **S-4 Best-combo replays in Catalog.** Each named-combo stamp stores the trace
  snippet of the first time you hit it; tapping the stamp replays that moment.

## Moat 2 — Feel (the Balatro lesson)

Feel is a thousand 1% decisions; clones spend 5% of the budget here. Keep spending
disproportionately. Candidates beyond the M2 cascade scope:

- **S-5 Sound choreography** pitched to the cascade ladder (same thresholds as the
  haptic escalation in `tokens.ts`); rent-week low-end rumble under the ambience.
- **S-6 Dusk/rent ambience** (already M4): room warms/dims as rent approaches; the
  shelf wood catches ember light on due day.
- **S-7 Catalog stamp "thunk"** — the collection moment gets the heaviest, most
  satisfying haptic+sound in the game. Discovery must feel like pressing a wax seal.
- **S-8 Micro-personality pass**: per-item idle quirks beyond breathing (coupon pages
  flutter as countdown hits 1; fishbowl fish darts when a neighbor lands).

## Moat 3 — Content cadence beats content volume

Items/combos are zod-validated data; the fuzz harness balances a patch in minutes.
Cadence is the weapon; volume is what clones do.

- **S-9 Remote signed item table** — weekly item drops / combo-of-the-week without
  app review. (Needs: table fetch + signature check + versioned cache; engine already
  treats the table as data.)
- **S-10 Weekly mutators** — one-line economy/table patches as named weeks ("the
  landlord is on vacation", "everything is perishable"), fuzz-gated before ship.
- **S-11 Seasonal packs** — 6–10 items + 3 combos + 1 shelf skin per season; the tag
  grammar means new items cross-pollinate with the whole back catalog automatically.
- **S-12 Fuzz-as-live-ops** — publish a balance dashboard from fuzz stats per patch
  (died-at-rent distribution, strategy dominance) as a public dev-log artifact;
  transparency itself becomes brand.

## Moat 4 — Identity & language

- **S-13 Named combos as vocabulary** — surface combo names everywhere (end screen,
  share cards, catalog); players should *speak* in them ("finally hit Infinite
  Reflection"). Add rare/absurd ones that become community grails.
- **S-14 Catalog completion identity** — 56 stamps (and growing per S-11); completion
  % + rarest-stamp on the share card; "album" framing over "achievements".
- **S-15 Shelfkeeper characters** (explicitly out of MVP) — run modifiers with faces;
  the Shop Cat is already the mascot; keepers give runs a narrator voice.
- **S-16 Daily shelf as shared conversation** — same seed worldwide (M5) + S-3 ghosts;
  the daily is the watercooler. Share card designed screenshot-first (M5 scope).
- **S-17 Streaks & rituals** — daily streak stamped in the album, gentle (cozy, not
  punishing); "opening the shop" as a morning ritual framing.

## Review cadence

- At each milestone review: skim this file, promote at most 1–2 items into scope.
- After MVP ship: full pass — rank by (retention impact × clone-resistance ÷ cost).
- Rule of thumb inherited from the kickoff: anything promoted must pass the same
  gates as core scope (fuzz for economy items, feel bar for presentation items).
