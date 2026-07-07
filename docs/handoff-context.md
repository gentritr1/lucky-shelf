# Lucky Shelf — project handoff (paste into a fresh chat to continue)

I'm continuing work on **Lucky Shelf**, a cozy spatial roguelite for phones (Expo +
TypeScript, portrait). It's at `/Users/gentlegen/Desktop/lucky-shelf`, pushed to
github.com/gentritr1/lucky-shelf (branch `main`). Read `AGENTS.md` and
`docs/lucky-shelf-kickoff.md` first — they're the source of truth.

## How this project runs (role-play)
Three AI roles + me relaying: **Fable** (orchestrator/director/reviewer — owns item
table, balance, all fun/feel rulings), **Codex = Lane A** (sim/engine/economy/
persistence/scaffolding), **Opus = Lane B** (UI/screens/Skia/juice/art). Each milestone a
lane posts a Review Packet in `docs/review-packets/` and stops; Fable reviews. Rulings are
numbered (R-1…R-43) and cited across packets. In practice the assistant wears all hats and
builds directly when asked, and generates art via the Higgsfield MCP.

## State: M0–M5 complete + visual-polish passes, all pushed
- Engine: full rule grammar, scoring traces, replay, determinism, fuzz — 59 tests green,
  tsc strict clean.
- Persistence: run saves, catalog, daily — all versioned + fail-safe.
- Loop: draft → arrange (drag) → cascade (every coin explained) → rent → restock →
  gameOver → summary → share.
- Meta: catalog album (56 stamps), daily shelf (date-seeded, one attempt), share card,
  dusk ambience, onboarding hint.
- Art: 36 cozy-gouache item sprites + key art + icon (Higgsfield/nano_banana_2, style-
  locked to the Shop Cat mascot). **All sprites are transparent PNGs** (background
  removed), framed on padded mats so they float. Manifest: `assets/sprites/manifest.json`.
- Polish: responsive centered device-frame column on wide screens; **Baloo 2 (display) +
  Nunito (body)** via expo-font (`assets/fonts`); geometric View-based icons (no emoji);
  even shelf geometry; contained offer-card tags.

## Environment quirks (critical)
- Default Node is v14 and BREAKS everything. Prepend
  `export PATH="$HOME/.nvm/versions/node/v20.19.4/bin:$PATH"` (arm64; NOT v23.3.0 — x86).
- corepack pnpm is broken. Run tools directly: `node_modules/.bin/tsc --noEmit`,
  `node_modules/.bin/vitest run`, `node --import tsx <script>`.
- Web preview via the `expo-web` launch config (port 8090). Metro regenerates expo-router
  route types on bundle, so a brand-new route needs a bundle before tsc passes. New
  bundled assets (sprites/fonts) may need a server restart to serve. Don't regress
  `babel.config.js`. `ios/` is gitignored (regenerate via `expo prebuild`).
- Drag placement can't be driven by synthetic web input (gesture-handler); a live run to
  gameOver needs a real device. Seed localStorage to demo populated states (keys:
  `luckyShelf:save:v1:activeRun`, `luckyShelf:catalog:v1`, `luckyShelf:daily:v1`).
- Higgsfield starter plan caps at ~4 concurrent jobs; `remove_background` accepts a
  generation `job_id` as `media_id`; collect results via `show_generations`.

## Open / optional (nothing blocking)
- **Fun gate**: a device screen-recording of a full run (feel/haptics) — the one thing
  that needs real hardware. Shot list in `docs/review-packets/B-M3-review.md`.
- **Audio**: `expo-audio` is in the stack; user has Suno for mp3s. Prompts drafted (main/
  arrange loop, rent-tension variant, title theme, cascade sting). Drop mp3s in
  `assets/audio/` and wire playback hooks + a Settings mute toggle.
- **Art chrome (§7)**: dusk backdrop, shelf frame, combo/stamp frames not yet generated
  (user has Midjourney too — match palette #8A5A38 wood / #F4E8D3 cream / #FFD9A0
  sunlight / #3E8E7E teal).
- **Moat ledger**: `docs/product-moat-suggestions.md` (S-1…S-17) — post-MVP ideas.

## Repo map
`src/contracts` (frozen zod contract), `src/sim` (pure engine), `src/items` (Fable data),
`src/persistence`, `src/state` (zustand stores: run/catalog/daily/onboarding),
`src/app` (expo-router screens), `src/ui` (design system, tokens, icons),
`src/juice` (Skia scene, cascade, sprites), `assets/` (sprites, fonts, branding),
`docs/review-packets` (all reviews + rulings R-1…R-43).

Tell me which thread to pick up: wire Suno audio, generate §7 art chrome / Midjourney
prompts, the device fun-gate, or something else.
