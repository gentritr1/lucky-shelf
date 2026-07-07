# Research findings — how comparable games fix "too linear," and what to steal

Synthesis of a research pass across Luck be a Landlord, Balatro, Backpack Hero, Dungeon Clawler,
Stacklands, Monster Train, Cobalt Core, Slay the Spire. Companion to
`docs/research-prompt-depth-retention.md` and `docs/loop-redesign-v2-spec.md`. Sources at bottom.

## The one-line diagnosis these games agree on
Depth doesn't come from a clever scoring engine alone — it comes from **a critical mass of pieces
that talk to each other, a few of which redefine your run, acquired through a shop under a rising
target.** Lucky Shelf has the engine and (with v2) the acquisition rate; it's missing **run-defining
pieces, a goal ladder, and legible synergy volume.**

## Ranked shortlist — 5 mechanics to steal (mapped to our shelf)

### 1. Escalating score-target ladder  — HIGH  (Balatro "blinds")
**Mechanic:** each round has a rising **score target**; beat it → a shop/reward → the next target is
higher. Balatro runs on 8 antes × 3 blinds of escalating chip requirements.
**Fixes:** our "no in-run goal but rent." Gives a chase and per-day pacing.
**Shelf mapping:** "**Today's customers expect ≥N sales.**" Beat it → a reward pick (extra reroll /
discount / a signature item). Rent stays the *weekly* wall; the daily target is the *heartbeat*.
Deterministic-friendly (a target is just a number). This is our planned Phase 3 — **validated.**

### 2. Run-defining "signature" stock  — HIGH  (Balatro Jokers · LbaL special symbols · Monster Train)
**Mechanic:** a few collectible pieces that **change the math**, not just add value — so "you build
around flushes one run, full houses the next." Monster Train's lesson: make synergies **explosive AND
legible** so a player feels the run "turn on."
**Fixes:** our "no build identity — it's just place items." This is the biggest gap.
**Shelf mapping:** a small set of **signature stock** items that bend scoring — e.g. a *Brass Scale*
(×'s every food item on the shelf), a *Ledger* (scores +coins per antique), a *Lucky Cat* that copies
its best neighbor. Cozy reskins of Jokers. Acquired from the shop; 1–2 define your run's engine.
**This upgrades our Phase 2** beyond plain tag-set multipliers.

### 3. Player-directed, randomized build steering  — MED-HIGH  (Stacklands · Slay the Spire)
**Mechanic:** let the player **choose a direction** (Stacklands "theme packs"; StS "route choices that
matter before you draw your hand") while the results stay randomized — a plan forms *early*, luck fills
it in.
**Fixes:** early linearity — you have a plan from turn 1 instead of drifting.
**Shelf mapping:** at run start (or via a biased reroll / a "supplier" pick) let the player **lean a
tag/archetype**, so the shop skews toward it. Turns "draft whatever" into "I'm building the antique shelf."

### 4. Critical mass + legible synergy  — MED-HIGH  (Dungeon Clawler · LbaL volume)
**Mechanic:** Dungeon Clawler — "the combo needs a machine **full of pieces that actually talk to each
other**." LbaL depth is partly raw **volume** (150+ symbols) with clear adjacency. Depth needs both
enough interacting pieces **and** signposting of what combos.
**Fixes:** shallow early = too few pieces + illegible synergy. Answers our "36 items vs 150" question:
**yes, we likely need more variety — but legibility matters more than raw count.**
**Shelf mapping:** grow the item pool over updates, and **surface synergy hints** in the shop/shelf
("pairs with food," a glow between items that combo). Minimum viable variety > raw dump.

### 5. Placement-as-puzzle from turn 1  — MED (watch complexity)  (Backpack Hero)
**Mechanic:** Backpack Hero makes *where* deep via item **shapes** (tetromino tiles), a **growing
grid**, and distance/row/column effects — "rewards clever arrangement over raw power."
**Fixes:** placement isn't a puzzle when the board is empty.
**Shelf mapping (lighter, to protect cozy simplicity):** a few **multi-slot items** (a display case =
2 slots) and **slot/row modifiers** (our spotlight is a first step) make position matter even with 2–3
items. **Caution:** full shape-Tetris likely clashes with our calm one-handed tone — take the *idea*
(position has stakes early), not the full complexity.

## Cross-cutting truths
- **The core tension is right:** earn-now vs. build-for-later (LbaL, Stacklands' feed-your-people vs
  expand). Our rent already provides it — it just doesn't *bite* until the board is dense and the
  engine has signature pieces.
- **"One more run" = variable, run-defining shops** (Balatro), not notifications. Each run's logic
  differs because the shop offered different signature pieces.
- **Forced reinvention** (Backpack Hero) keeps it fresh — new pieces make you re-plan.

## Constraint clashes to respect
- **Deterministic scoring:** all 5 are compatible (targets, modifiers, and shop steering are
  deterministic). Avoid Backpack Hero's real-time energy / dexterity — stay turn-based.
- **Cozy theme:** reskin combat/"destruction" archetypes into shopkeeping ones (clearance, perishables,
  luxury, collectibles). No violence framing.
- **Mobile / short sessions:** these are mostly PC long-session games. For us: make the goal ladder a
  **per-day** short beat; keep signature items **few and legible** (not 150 to learn); gentle onboarding;
  grow content over updates, not at launch.

## Net effect on our plan
Validates Phases 1 (density) and 3 (goal ladder). **Sharpens Phase 2:** build identity should be
**signature stock (run-defining items) + tag archetypes + build-steering**, not tag multipliers alone.
Adds a Phase 4 line: **more item variety + synergy legibility** (volume with signposting).

## Sources
- [Luck be a Landlord — Grokipedia](https://grokipedia.com/page/Luck_Be_a_Landlord) · [LbaL Synergies wiki](https://luck-be-a-landlord.fandom.com/wiki/Synergies)
- [Why Balatro is addictive — Armchair Arcade](https://armchairarcade.com/perspectives/2026/05/20/balatro-game-review-why-is-it-so-addictive/) · [How Balatro rewards players — Kokutech](https://www.kokutech.com/blog/gamedev/design-patterns/power-fantasy/balatro)
- [Backpack Hero — Grokipedia](https://grokipedia.com/page/Backpack_Hero) · [Backpack Hero review — Turn Based Lovers](https://turnbasedlovers.com/review/backpack-hero-impressions/)
- [Dungeon Clawler — Roguelike Hub](https://roguelikehub.com/games/dungeon-clawler) · [Dungeon Clawler tips — Driffle](https://driffle.com/blog/dungeon-clawler-tips-and-tricks-for-better-gameplay/)
- [Stacklands and the UX of Cards — JB Oger](https://jboger.substack.com/p/stacklands) · [Game Design Perspective: Stacklands — Pixelated Playgrounds](https://www.pixelatedplaygrounds.com/sidequests/game-design-perspective-stacklands)
- [Best Roguelike Deckbuilders 2026 — GlyphShuffle](https://glyphshuffle.com/blog/best-roguelike-deckbuilders-2026) (Monster Train / Cobalt Core / Slay the Spire archetype notes)
