# Research prompt — fixing "too linear," adding tactics + retention

Paste this into a deep-research tool (or hand to a research agent). It is **fully self-contained**
— the reader cannot see our code or app, so everything needed is below.

---

## Big picture: what Lucky Shelf is
A **cozy shopkeeper roguelike** for mobile (portrait, storybook/watercolor art, calm tone — think
"Stardew-adjacent coziness" not "hardcore roguelike"). You run a small general store. The fantasy is
**arranging a shelf of goods that sell well together**.

### How a run works today
- **Shelf:** a **3×4 grid (12 slots)**. Items are **placed by drag-and-drop**; where an item sits
  matters because scoring is about **neighbors**.
- **A day =** acquire item(s) → arrange them on the shelf → tap **"Open Shop"** → a **scoring
  cascade** animates and pays out coins.
- **Scoring (the engine, and our moat):** fully **deterministic** (same shelf → same coins, replayable
  from a seed). Items score via: a **base value**; **adjacency rules** (e.g. "+3 if next to a food
  item," "×2 if adjacent to an antique"); **row/column auras** (an item multiplies its whole row);
  and **named combos** (specific sets like "Wine + Cheese" fire a bonus and get recorded). ~15 rule
  types exist (grants-to-adjacent, per-adjacent, copies-neighbor, loner-bonus, conditional-multiplier,
  transforms-neighbor, ages-over-time, countdown-vanish, etc.).
- **Rent:** due **every 3 days**, escalating (~25 → 36 → …, a sawtooth wall). Coins ≥ rent or the run
  ends. Rent is the only fail state.
- **Items:** **36 total**, each with a **tier (1–4)** and **tags** (food, antique, lucky, fancy,
  fragile, drink, plant, toy, sweet, etc.). Tier-weighted offers shift toward higher tiers as days pass.
- **Meta:** a permanent **Catalog** (every item/combo ever discovered + best-run stats) persists across
  runs. A **daily seed** mode exists.
- **Acquisition, historically:** **1 free item drafted from 3 offers per day**; a paid buy-multiple
  "restock" shop only every 3rd day.

### The core problem (verified by playing on device)
It **feels too linear and shallow**, worst early:
- **One low-stakes decision per day** (draft 1, drop it). The board is near-empty for the first
  several days, so *placement isn't a real puzzle yet*.
- The genuine depth (adjacency, combos) only becomes decision-relevant once the board is dense
  (~day 5+) — but rent frequently ends runs before then. **Depth is back-loaded past where runs die.**
- **No in-run goal beyond "don't miss rent"** — no escalating target, no build identity, no obvious
  "one more run" hook. Players literally ask: *"where are the tactics? what's the goal? just 1 item
  a day?"*

## Our current thinking (please critique / pressure-test this)
We concluded this is a **loop-shape problem**, not polish — the game is a **Luck-be-a-Landlord /
Balatro-shaped game starved of decisions and build agency**, sitting on top of a genuinely deep
scoring engine. Our planned redesign (phased, each behind a flag, fuzz-tested + device-felt):
1. **Decision density (built, behind a flag):** every day becomes a **buy-multiple shop** (coins gate
   acquisition, starting coins so day-1 you buy 2–3) → the board fills in days, not weeks.
2. **Build identity:** promote a "collect N of a tag → multiplier" mechanic to core **tag-set
   archetypes** (a food engine vs an antique engine), and — a hypothesis from early research — add a
   few **run-defining "signature" items** (our equivalent of Balatro Jokers / LbaL special symbols)
   that *change the scoring math*, so each run has its own logic.
3. **Goal ladder:** a **daily/round score target** with a reward for beating it (Balatro's blinds),
   layered over the rent wall, for pacing and a chase.
4. **Balance + more content:** re-tune, and likely **increase item variety** (36 may be too few vs
   LbaL's 150+ interacting pieces).

### Hard constraints (a suggestion that breaks these is less useful)
- **Keep deterministic scoring** (no real-time dexterity, no hidden RNG mid-scoring — it must stay
  replayable and "explain every coin").
- **Keep the cozy shopkeeper theme** (no violence/"destruction build" framing; reskin such ideas).
- **Mobile, short sessions, one-handed, portrait.** Onboarding must stay gentle.
- Small team; prefer **elegant systems over huge content dumps**, but tell us if volume is unavoidable.

## Research questions (want CONCRETE mechanics, named per game — not generic advice)
1. **Early-turn depth:** how do comparable games make the *first few turns* tactically interesting
   when the board/deck is nearly empty?
2. **Build identity / archetypes:** how do they make a run *feel like a strategy* rather than "place
   items"? What makes items **run-defining** vs incremental?
3. **Goal ladder / pacing:** how is in-run tension paced (escalating targets vs a single wall)? What's
   the reward loop for beating a target?
4. **Variable reward / "one more run":** what specifically drives ethical repeat sessions?
5. **Grid/placement depth:** for spatial-grid games, what makes *where* you place things a deep
   decision *early*?
6. **Content volume vs depth:** how much depth is raw variety of interacting pieces vs elegant
   systems? What's the minimum viable variety?

Games to draw from (add others): **Luck be a Landlord, Balatro, Backpack Hero, Dungeon Clawler,
Stacklands, Slice & Dice, Peglin, Shop Titans, Cultist Simulator, Slay the Spire, Monster Train**.

## Desired output
- A **ranked shortlist of the 5 highest-leverage mechanics to steal**, each with: source game, the
  exact mechanic, which of our problems it fixes, and **how it maps onto a shopkeeper / shelf-placement
  theme** under our constraints.
- Any mechanic that would **clash** with our deterministic-scoring or cozy constraints (and a reskin if
  one exists).
- Notes on **mobile session-length / onboarding** differences from these (mostly PC) games.
