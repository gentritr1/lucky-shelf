import { z } from 'zod';

export const ContractSchemaVersion = 1;

const idSchema = z.string().min(1);
const moneySchema = z.number().int();
const positiveMoneySchema = z.number().int().min(0);
const nonNegativeIntSchema = z.number().int().min(0);
const positiveIntSchema = z.number().int().positive();

export const ItemTierSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

export const SlotSchema = z
  .object({
    row: nonNegativeIntSchema,
    col: nonNegativeIntSchema,
  })
  .strict();

export const ShelfSizeSchema = z
  .object({
    rows: z.number().int().min(1).max(4),
    cols: z.number().int().min(1).max(5),
  })
  .strict();

export const ItemInstanceStateSchema = z
  .object({
    ageDays: nonNegativeIntSchema.default(0),
    growthDays: nonNegativeIntSchema.default(0),
    countdown: nonNegativeIntSchema.nullable().default(null),
    sticky: z.boolean().default(false),
    blocked: z.boolean().default(false),
    transformedFromItemId: idSchema.nullable().default(null),
  })
  .strict();

export const ItemInstanceSchema = z
  .object({
    instanceId: idSchema,
    itemId: idSchema,
    name: idSchema,
    tier: ItemTierSchema,
    baseValue: moneySchema,
    tags: z.array(idSchema),
    state: ItemInstanceStateSchema,
  })
  .strict();

export const SlotStateSchema = z
  .object({
    slot: SlotSchema,
    item: ItemInstanceSchema.nullable(),
  })
  .strict();

export const ShelfSchema = z
  .object({
    size: ShelfSizeSchema,
    slots: z.array(SlotStateSchema),
  })
  .strict()
  .superRefine((shelf, ctx) => {
    const expectedSlotCount = shelf.size.rows * shelf.size.cols;
    if (shelf.slots.length !== expectedSlotCount) {
      ctx.addIssue({
        code: 'custom',
        message: `Shelf has ${shelf.slots.length} slots, expected ${expectedSlotCount}.`,
        path: ['slots'],
      });
    }

    const seenSlots = new Set<string>();
    const seenInstances = new Set<string>();
    for (const [index, slotState] of shelf.slots.entries()) {
      const { row, col } = slotState.slot;
      if (row >= shelf.size.rows || col >= shelf.size.cols) {
        ctx.addIssue({
          code: 'custom',
          message: `Slot ${row},${col} is outside ${shelf.size.rows}x${shelf.size.cols}.`,
          path: ['slots', index, 'slot'],
        });
      }

      const slotKey = toSlotKey(slotState.slot);
      if (seenSlots.has(slotKey)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate slot ${slotKey}.`,
          path: ['slots', index, 'slot'],
        });
      }
      seenSlots.add(slotKey);

      if (slotState.item) {
        if (seenInstances.has(slotState.item.instanceId)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate item instance ${slotState.item.instanceId}.`,
            path: ['slots', index, 'item', 'instanceId'],
          });
        }
        seenInstances.add(slotState.item.instanceId);
      }
    }
  });

export const RuleDeltaSchema = z
  .object({
    flat: moneySchema.optional(),
    mult: z.number().positive().optional(),
  })
  .strict()
  .refine((delta) => delta.flat !== undefined || delta.mult !== undefined, {
    message: 'A rule delta must include flat, mult, or both.',
  });

export const RuleTargetSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('tag'),
      tag: idSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('item'),
      itemId: idSchema,
    })
    .strict(),
]);

export const DirectionSchema = z.enum(['left', 'right', 'up', 'down']);

export const ShelfWideEffectSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('rowMultiplier'),
      mult: z.number().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('shelfMultiplier'),
      mult: z.number().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('moveLock'),
    })
    .strict(),
]);

export const ItemRuleSchema = z.discriminatedUnion('kind', [
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('adjacentTo'),
      target: RuleTargetSchema,
      delta: RuleDeltaSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('perAdjacent'),
      target: RuleTargetSchema,
      delta: RuleDeltaSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('copiesNeighbor'),
      direction: DirectionSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('auraRow'),
      delta: RuleDeltaSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('auraColumn'),
      delta: RuleDeltaSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('scoresLast'),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('transformsAdjacent'),
      target: RuleTargetSchema,
      afterDays: positiveIntSchema,
      toItemId: idSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('blocksSlot'),
      shelfWideEffect: ShelfWideEffectSchema.optional(),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('onSell'),
      delta: RuleDeltaSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('growsEachDay'),
      intervalDays: positiveIntSchema,
      target: RuleTargetSchema.optional(),
    })
    .strict(),
  // --- CCR-1 additions (Fable-approved 2026-07-06): primitives required by the
  // exemplar-12 that the M0 vocabulary could not express. All additive. ---
  z
    .object({
      ruleId: idSchema,
      // Mutates instance baseValue at day rollover (freeze R-8). Cheese +1, Coupon -1.
      kind: z.literal('agesDaily'),
      flatPerDay: z.number().int(),
      minValue: moneySchema.optional(),
      // R-10: table-side cap so aging items plateau instead of compounding forever.
      maxValue: moneySchema.optional(),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      // Benefits adjacent items (not the source): Honey Jar, Ice Box. The ruleFire
      // is emitted in the beneficiary's resolution window (freeze R-6).
      kind: z.literal('grantsAdjacent'),
      target: RuleTargetSchema.optional(),
      delta: RuleDeltaSchema,
      makesSticky: z.boolean().optional(),
      preventsAging: z.boolean().optional(),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      // Fires only when the item has zero occupied orthogonal neighbors. Fishbowl.
      kind: z.literal('lonerBonus'),
      delta: RuleDeltaSchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      // Requires >=1 adjacent scored item and all adjacent totals >= threshold.
      // Only meaningful alongside scoresLast. Antique Clock.
      kind: z.literal('multIfAdjacentMinTotal'),
      threshold: positiveIntSchema,
      mult: z.number().positive(),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      // The row's leftmost occupied slot scores twice (x2 in its window). Vintage Radio.
      kind: z.literal('echoLeftmostInRow'),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      // instance.countdown initialized to days, decremented at rollover; at zero the
      // item grants adjacent items grantAdjacent during scoring, then vanishes. Coupon Stack.
      kind: z.literal('countdownVanish'),
      days: positiveIntSchema,
      grantAdjacent: RuleDeltaSchema,
    })
    .strict(),
  // CCR-2 additions (pending Fable sign-off): signature stock rules. These
  // resolve after ordinary item windows when SIGNATURE_ITEMS_ENABLED is on.
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('tagFilteredShelfMultiplier'),
      tag: idSchema,
      mult: z.number().positive(),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('flatPerTagCount'),
      tag: idSchema,
      flatPerItem: moneySchema,
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('copyHighestScoringOther'),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('shelfMultiplierIfAnyTagCount'),
      minCount: positiveIntSchema,
      mult: z.number().positive(),
    })
    .strict(),
  z
    .object({
      ruleId: idSchema,
      kind: z.literal('highestBaseValueMultiplier'),
      mult: z.number().positive(),
    })
    .strict(),
]);

export const ItemDefinitionSchema = z
  .object({
    id: idSchema,
    name: idSchema,
    tier: ItemTierSchema,
    baseValue: moneySchema,
    tags: z.array(idSchema),
    rules: z.array(ItemRuleSchema),
    // Fable-authored upgrade graph: tier upgrades (e.g. Lucky Bamboo) resolve to
    // this concrete item id. Items without it are not upgradeable. (Freeze R-4)
    upgradesToItemId: idSchema.optional(),
    // Signature stock is a Phase 2c shop/scoring prototype. Optional so v1
    // saves, fixtures, and non-signature items remain contract-compatible.
    isSignature: z.boolean().optional(),
  })
  .strict();

export const DeliveryOfferSchema = z
  .object({
    offerId: idSchema,
    item: ItemDefinitionSchema,
    cost: positiveMoneySchema.default(0),
  })
  .strict();

export const RentStateSchema = z
  .object({
    amount: positiveIntSchema,
    dueInDays: nonNegativeIntSchema,
    cycle: positiveIntSchema,
  })
  .strict();

export const MoveStateSchema = z
  .object({
    freeRemaining: nonNegativeIntSchema,
    paidMoveCost: positiveIntSchema,
  })
  .strict();

export const RunStatsSchema = z
  .object({
    totalCoinsEarned: positiveMoneySchema,
    deepestRentSurvived: nonNegativeIntSchema,
    daysSurvived: nonNegativeIntSchema,
    bestDayTotal: positiveMoneySchema,
    bestComboIds: z.array(idSchema),
    // B-M4 near-miss drama (CCR for Fable): the minimum coins-to-spare across the
    // run's successful rent payments, for the summary's "paid with N to spare"
    // line. Optional + additive — older saves/fixtures omit it, and it is only
    // ever written on a successful rent payment, so the M0 goldens (trace-only)
    // and the determinism-fixture run (dies day 3 before paying) are untouched.
    // No ContractSchemaVersion bump.
    closestRentMargin: nonNegativeIntSchema.optional(),
  })
  .strict();

export const CatalogDeltaSchema = z
  .object({
    discoveredItemIds: z.array(idSchema),
    discoveredComboIds: z.array(idSchema),
  })
  .strict();

// Loop v2 Phase 3 goal ladder result for the last scored day. Optional and
// additive: older saves/fixtures omit it, and the flag-off path never creates it.
export const DailyTargetResultSchema = z
  .object({
    day: positiveIntSchema,
    target: positiveMoneySchema,
    dayTotal: positiveMoneySchema,
    targetMet: z.boolean(),
    rewardKind: z.literal('freeReroll'),
    rewardGranted: z.boolean(),
  })
  .strict();

/**
 * The permanent Catalog — the collection meta (kickoff §1). Additive to the
 * frozen contract (GameState/Action/TraceEvent unchanged); Fable-approved M4.
 * Every item ever seen, every named combo ever fired (with counts), best-run
 * stats. Persisted across runs, outside the seeded run state.
 */
export const CatalogSchemaVersion = 1;

export const CatalogStatsSchema = z
  .object({
    runsPlayed: nonNegativeIntSchema,
    bestDayTotal: positiveMoneySchema,
    deepestRentSurvived: nonNegativeIntSchema,
    mostCoinsInARun: positiveMoneySchema,
    totalCoinsAllTime: positiveMoneySchema,
    // B-M4 personal best: the longest run (days survived) ever. Additive with a
    // safe default — an older persisted catalog omits it, so `.default(0)` fills
    // it on load (absent = unknown history → 0, then rebuilt by Math.max on the
    // next recorded run). Old catalogs still parse; no CatalogSchemaVersion bump,
    // never a wipe. See the migration note in the B-M4 review packet.
    longestRun: nonNegativeIntSchema.default(0),
  })
  .strict();

export const CatalogSchema = z
  .object({
    schemaVersion: z.literal(CatalogSchemaVersion),
    discoveredItemIds: z.array(idSchema),
    achievedComboIds: z.array(idSchema),
    comboCounts: z.record(idSchema, nonNegativeIntSchema),
    stats: CatalogStatsSchema,
  })
  .strict();

export const TraceEventSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('itemBase'),
      slot: SlotSchema,
      value: moneySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('ruleFire'),
      sourceSlot: SlotSchema,
      targetSlot: SlotSchema,
      ruleId: idSchema,
      delta: RuleDeltaSchema,
      runningTotal: moneySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('comboNamed'),
      comboId: idSchema,
      slots: z.array(SlotSchema).min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('rowAura'),
      sourceSlot: SlotSchema,
      row: nonNegativeIntSchema,
      mult: z.number().positive(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('itemTotal'),
      slot: SlotSchema,
      total: moneySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('dayTotal'),
      coins: moneySchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal('transform'),
      slot: SlotSchema,
      fromItem: idSchema,
      toItem: idSchema,
    })
    .strict(),
  // CCR-1: an item leaves the shelf (Coupon Stack at countdown zero). Emitted with
  // transforms, after itemTotals and before dayTotal.
  z
    .object({
      kind: z.literal('vanish'),
      slot: SlotSchema,
      itemId: idSchema,
    })
    .strict(),
]);

export const ScoringTraceSchema = z
  .object({
    traceId: idSchema,
    day: positiveIntSchema,
    seed: idSchema,
    events: z.array(TraceEventSchema).min(1),
  })
  .strict()
  .superRefine((trace, ctx) => {
    const lastEvent = trace.events.at(-1);
    if (lastEvent?.kind !== 'dayTotal') {
      ctx.addIssue({
        code: 'custom',
        message: 'A scoring trace must end with a dayTotal event.',
        path: ['events', trace.events.length - 1],
      });
    }
  });

export const GamePhaseSchema = z.enum([
  'delivery',
  'arrange',
  'openShop',
  'restock',
  'gameOver',
]);

// PROTOTYPE (Today's Order): the day's collection demand — fill the shelf with
// `count` items carrying `tag` to earn a set bonus. Additive/optional like
// `spotlight`, so no ContractSchemaVersion bump and no save wipe.
export const DailyOrderSchema = z
  .object({
    tag: idSchema,
    count: positiveIntSchema,
  })
  .strict();

export type DailyOrder = z.infer<typeof DailyOrderSchema>;

export const GameStateSchema = z
  .object({
    schemaVersion: z.literal(ContractSchemaVersion),
    runId: idSchema,
    seed: idSchema,
    phase: GamePhaseSchema,
    day: positiveIntSchema,
    coins: positiveMoneySchema,
    shelf: ShelfSchema,
    rent: RentStateSchema,
    moves: MoveStateSchema,
    currentOffers: z.array(DeliveryOfferSchema),
    heldItem: ItemInstanceSchema.nullable(),
    lastScoringTrace: ScoringTraceSchema.nullable(),
    runStats: RunStatsSchema,
    catalogDelta: CatalogDeltaSchema,
    // PROTOTYPE (Front Window): the day's spotlight slot. Optional + additive so
    // v1 saves and M0 fixtures that omit it still parse — no ContractSchemaVersion
    // bump, no save wipe. Absent/null = no spotlight this day (flag off).
    spotlight: SlotSchema.nullable().optional(),
    // PROTOTYPE (Today's Order): the day's collection demand. Same additive/optional
    // save-safety as `spotlight`. Absent/null = no order this day (flag off).
    dailyOrder: DailyOrderSchema.nullable().optional(),
    // Loop v2 Phase 2b build steering: optional supplier lean chosen at run start.
    // Absent = feature flag off / older save. Null = flag on, no lean chosen yet.
    supplierTag: idSchema.nullable().optional(),
    // Loop v2 Phase 3 goal ladder: optional current-day target and last result.
    // Absent = feature flag off / older save. freeRerollTokens are consumed by
    // the existing reroll action before coins.
    dailyTarget: positiveMoneySchema.optional(),
    dailyTargetResult: DailyTargetResultSchema.optional(),
    freeRerollTokens: nonNegativeIntSchema.optional(),
    // Loop v2 Phase 1: snapshot of LOOP_V2_ENABLED taken once at run creation, so
    // a run stays internally consistent (all v1 or all v2) even if the env flag is
    // flipped mid-session (hot reload / fuzz). Additive + optional like the fields
    // above — no ContractSchemaVersion bump, no wipe. Absent = flag off at creation
    // / older save = a v1 run; only ever present (true) for a run started under v2.
    loopV2: z.boolean().optional(),
    // A-M7 unlock ladder: the offerable item ids snapshotted when this run was
    // created. Additive + optional; absent means legacy/full-pool behavior.
    // Sorted by the sim so replays and saves stay deterministic. No version bump.
    unlockedItemIds: z.array(idSchema).optional(),
  })
  .strict();

export const ActionSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('chooseSupplier'),
      tag: idSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('draftItem'),
      offerIndex: nonNegativeIntSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('placeItem'),
      slot: SlotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('moveItem'),
      from: SlotSchema,
      to: SlotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('sellItem'),
      slot: SlotSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('openShop'),
    })
    .strict(),
  z
    .object({
      type: z.literal('buyOffer'),
      offerIndex: nonNegativeIntSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('reroll'),
    })
    .strict(),
  z
    .object({
      type: z.literal('expandShelf'),
    })
    .strict(),
  z
    .object({
      type: z.literal('endRestock'),
    })
    .strict(),
  z
    .object({
      type: z.literal('abandonRun'),
    })
    .strict(),
]);

export const FixtureSchema = z
  .object({
    fixtureId: idSchema,
    title: idSchema,
    laneBUse: idSchema,
    notes: z.array(idSchema),
    gameState: GameStateSchema,
    scoringTrace: ScoringTraceSchema,
  })
  .strict();

export const FixtureCollectionSchema = z.array(FixtureSchema).length(6);

export type ItemTier = z.infer<typeof ItemTierSchema>;
export type Slot = z.infer<typeof SlotSchema>;
export type ShelfSize = z.infer<typeof ShelfSizeSchema>;
export type ItemInstanceState = z.infer<typeof ItemInstanceStateSchema>;
export type ItemInstance = z.infer<typeof ItemInstanceSchema>;
export type SlotState = z.infer<typeof SlotStateSchema>;
export type Shelf = z.infer<typeof ShelfSchema>;
export type RuleDelta = z.infer<typeof RuleDeltaSchema>;
export type RuleTarget = z.infer<typeof RuleTargetSchema>;
export type Direction = z.infer<typeof DirectionSchema>;
export type ShelfWideEffect = z.infer<typeof ShelfWideEffectSchema>;
export type ItemRule = z.infer<typeof ItemRuleSchema>;
export type ItemDefinition = z.infer<typeof ItemDefinitionSchema>;
export type DeliveryOffer = z.infer<typeof DeliveryOfferSchema>;
export type RentState = z.infer<typeof RentStateSchema>;
export type MoveState = z.infer<typeof MoveStateSchema>;
export type RunStats = z.infer<typeof RunStatsSchema>;
export type CatalogDelta = z.infer<typeof CatalogDeltaSchema>;
export type DailyTargetResult = z.infer<typeof DailyTargetResultSchema>;
export type CatalogStats = z.infer<typeof CatalogStatsSchema>;
export type Catalog = z.infer<typeof CatalogSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type ScoringTrace = z.infer<typeof ScoringTraceSchema>;
export type GamePhase = z.infer<typeof GamePhaseSchema>;
export type GameState = z.infer<typeof GameStateSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Fixture = z.infer<typeof FixtureSchema>;
export type FixtureCollection = z.infer<typeof FixtureCollectionSchema>;

export function toSlotKey(slot: Slot): string {
  return `${slot.row}:${slot.col}`;
}

export function parseGameState(value: unknown): GameState {
  return GameStateSchema.parse(value);
}

export function parseAction(value: unknown): Action {
  return ActionSchema.parse(value);
}

export function parseScoringTrace(value: unknown): ScoringTrace {
  return ScoringTraceSchema.parse(value);
}

export function parseFixture(value: unknown): Fixture {
  return FixtureSchema.parse(value);
}

export function parseFixtureCollection(value: unknown): FixtureCollection {
  return FixtureCollectionSchema.parse(value);
}

export function parseCatalog(value: unknown): Catalog {
  return CatalogSchema.parse(value);
}

export function emptyCatalog(): Catalog {
  return {
    schemaVersion: CatalogSchemaVersion,
    discoveredItemIds: [],
    achievedComboIds: [],
    comboCounts: {},
    stats: {
      runsPlayed: 0,
      bestDayTotal: 0,
      deepestRentSurvived: 0,
      mostCoinsInARun: 0,
      totalCoinsAllTime: 0,
      longestRun: 0,
    },
  };
}
