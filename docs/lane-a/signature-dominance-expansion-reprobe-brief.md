# Lane A brief — A-M6a-G2: signature dominance equal-n re-probe with shelf expansion ON

**Author:** Fable, 2026-07-09. **Implementer:** Codex (run AFTER A-M8 lands — same lane, shared
tree). **Type:** measurement packet, not a feature — closes graduation gate (2) from
[A-M6a-fable-review.md](../review-packets/A-M6a-fable-review.md).

## Context (self-sufficient)
The signature-item dominance gate was closed pre-expansion by an equal-n forced-seeding probe —
method and rationale in [A-M5b-signature-dominance-gate.md](../review-packets/A-M5b-signature-dominance-gate.md)
(natural-pickup fuzz is small-n noise and CANNOT close or reopen the gate; forced seeding with
equal n per item is the authoritative measurement; result then: max ratio 1.13, favorable-board
ceiling 1.74× < 2×). A-M6a's 4×4 shelf expansion changes the environment signatures live in
(more slots, ~30% natural pickup, higher totals), so the gate must be re-measured before
`SIGNATURE_ITEMS_ENABLED` + `SHELF_EXPANSION_ENABLED` can graduate together.

Toolchain `PATH="$HOME/.nvm/versions/node/v23.3.0/bin:$PATH"`; testkit `makeState` +
`resolveOpenShop` per the method note in the gate doc.

## Task
Reproduce the gate doc's three measurements with the expansion environment:
1. **Equal-n forced seeding (authoritative):** each signature item dropped into the SAME 3000
   realistic random boards — but boards are now sampled from EXPANDED (4×4) states as bots reach
   them (seed boards from flag-on fuzz snapshots or construct 16-slot boards at day-9+ realistic
   occupancy). Report per-item median day totals, `maxToAllSigRatio`, and lift over the
   no-signature baseline. **Gate line: no item > 2× the all-signature median.**
2. **Favorable-board ceiling probe:** each item on a 4×4 board built around it; marginal lift vs
   the strongest non-signature filler in the same slot. Report the max.
3. **Lucky-cat × spotlight interaction** (the standing eyeball item): include spotlight ON in one
   probe arm and report lucky-cat's ratio there specifically — the pre-expansion caveat was that
   its copy reads a post-spotlight total.

Unlike the original session's throwaway scripts, land the probe as a PERMANENT script
(`scripts/signature-dominance.ts`, seeded + deterministic) so future graduating-set changes rerun
it in one command — the tune-vs-graduating-set scar keeps firing; make this one cheap to repeat.

## Non-goals
No item-table, economy, or scoring changes regardless of findings — report and stop; retuning
signature numbers is Fable's call on the packet.

## Acceptance
1. The script runs deterministically (`--seed`), prints the three tables, and is wired as
   `pnpm sig:probe` (or documented equivalent).
2. Full floor untouched: pin, goldens, fixtures, suite green (script-only change + package.json).
3. The packet states the gate verdict per the 2× line, with n per cell shown (no small-n cells).

## Deliverable
`docs/review-packets/A-M6a-G2-dominance-reprobe.md` in the style of the original gate doc:
verdict first, what was run (executed, with commands), tables, caveats. **STOP — Fable rules on
the gate from the packet.**
