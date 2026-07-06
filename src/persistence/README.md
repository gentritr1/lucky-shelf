# Persistence Choice

M0 chooses `@react-native-async-storage/async-storage` for MVP persistence.

Reasoning:

- MVP data is small and document-shaped: active run snapshot, replay seed/action list, catalog discoveries, best stats, and daily shelf attempt metadata.
- The contract is already serializable JSON with an explicit `schemaVersion`, which makes key-level migrations straightforward.
- The Catalog scope is 36 items plus roughly 20 named combos, so queryable relational storage is not needed yet.
- AsyncStorage keeps the first implementation simple across Expo targets. If catalog analytics, cloud reconciliation, or larger history queries become real requirements, move to `expo-sqlite` behind the same persistence interface.

Initial keys:

- `luckyShelf:save:v1:activeRun`
- `luckyShelf:save:v1:catalog`
- `luckyShelf:save:v1:settings`
- `luckyShelf:save:v1:dailyShelf`

