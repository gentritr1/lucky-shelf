import type { ItemDefinition, ItemRule, RuleTarget } from '../contracts';

/**
 * CAT-3: player-facing prose for an item's scoring rules — the "WHAT IT DOES"
 * lines in the catalog showcase modal. PURE (no RN, no store): a rule → short
 * sentence formatter, one entry per rule, covering every kind the item table
 * can carry. Sentences are written from the sim's REAL semantics (see
 * src/sim/scoring.ts), not the rule name, so what the card says is what the
 * shelf does.
 *
 * The single neutral line for an item that carries no scoring rules — never
 * per-item invented flavor (the brief's explicit non-goal).
 */
export const RULES_FALLBACK = 'A dependable earner.';

/** Optional name resolver so an item-targeting rule (or a transform target) can
 *  read a display name instead of a raw id. Tag targets need no lookup. */
export interface DescribeOptions {
  itemName?: (itemId: string) => string;
}

/** "a drink item" / "a Fishbowl" — the thing a rule points at, as a noun phrase. */
function targetNoun(target: RuleTarget, opts: DescribeOptions | undefined): string {
  if (target.kind === 'tag') return `${target.tag} item`;
  return opts?.itemName?.(target.itemId) ?? target.itemId;
}

/** "each drink item" / "each Fishbowl" — for per-each phrasing. */
function eachNoun(target: RuleTarget, opts: DescribeOptions | undefined): string {
  if (target.kind === 'tag') return `each ${target.tag} item`;
  return `each ${opts?.itemName?.(target.itemId) ?? target.itemId}`;
}

/** Trim trailing zeros a Number() round-trip would leave; 1.5 → "1.5", 2 → "2". */
function mult(value: number): string {
  return String(value);
}

/** "a Fishbowl" / "an antique item" — pick the article by the noun's first sound. */
function withArticle(noun: string): string {
  return /^[aeiou]/i.test(noun) ? `an ${noun}` : `a ${noun}`;
}

/** One sentence for one rule, or null when the rule has no scoring effect to
 *  narrate (e.g. a bare delta with neither flat nor mult — schema-forbidden). */
function describeRule(rule: ItemRule, opts: DescribeOptions | undefined): string | null {
  switch (rule.kind) {
    case 'adjacentTo': {
      const who = withArticle(targetNoun(rule.target, opts));
      if (rule.delta.flat !== undefined) return `Earns +${rule.delta.flat} next to ${who}`;
      if (rule.delta.mult !== undefined) return `Scores ×${mult(rule.delta.mult)} next to ${who}`;
      return null;
    }
    case 'perAdjacent': {
      const who = eachNoun(rule.target, opts);
      if (rule.delta.flat !== undefined) return `Earns +${rule.delta.flat} for ${who} next to it`;
      if (rule.delta.mult !== undefined) return `Scores ×${mult(rule.delta.mult)} for ${who} next to it`;
      return null;
    }
    case 'copiesNeighbor':
      return `Copies the value of the item to its ${rule.direction}`;
    case 'auraRow': {
      if (rule.delta.mult !== undefined) return `Multiplies its whole row ×${mult(rule.delta.mult)}`;
      if (rule.delta.flat !== undefined) return `Gives every other item in its row +${rule.delta.flat}`;
      return null;
    }
    case 'auraColumn': {
      if (rule.delta.mult !== undefined) return `Multiplies its whole column ×${mult(rule.delta.mult)}`;
      if (rule.delta.flat !== undefined) return `Gives every other item in its column +${rule.delta.flat}`;
      return null;
    }
    case 'scoresLast':
      return 'Waits and scores last, after everything else';
    case 'transformsAdjacent': {
      const who = targetNoun(rule.target, opts);
      const into = opts?.itemName?.(rule.toItemId) ?? rule.toItemId;
      return `After ${rule.afterDays} days, turns a ${who} next to it into a ${into}`;
    }
    case 'blocksSlot': {
      const effect = rule.shelfWideEffect;
      if (effect?.kind === 'rowMultiplier') {
        return `Blocks its own slot, but multiplies its whole row ×${mult(effect.mult)}`;
      }
      if (effect?.kind === 'shelfMultiplier') {
        return `Blocks its own slot, but multiplies the whole shelf ×${mult(effect.mult)}`;
      }
      if (effect?.kind === 'moveLock') return 'Blocks its own slot and locks it in place';
      return 'Blocks its own slot from scoring';
    }
    case 'onSell': {
      if (rule.delta.flat !== undefined) return `Pays +${rule.delta.flat} extra when you sell it`;
      if (rule.delta.mult !== undefined) return `Sells for ×${mult(rule.delta.mult)} its value`;
      return null;
    }
    case 'growsEachDay': {
      const who = rule.target ? `a ${targetNoun(rule.target, opts)} next to it` : 'one item next to it';
      return `Every ${rule.intervalDays} days, upgrades ${who} into its better version`;
    }
    case 'agesDaily': {
      if (rule.flatPerDay > 0) {
        const cap = rule.maxValue !== undefined ? ` (up to ${rule.maxValue})` : '';
        return `Gains +${rule.flatPerDay} in value each day${cap}`;
      }
      if (rule.flatPerDay < 0) {
        const floor = rule.minValue !== undefined ? ` (down to ${rule.minValue})` : '';
        return `Loses ${-rule.flatPerDay} in value each day${floor}`;
      }
      return 'Holds its value each day';
    }
    case 'grantsAdjacent': {
      const who = rule.target ? `each ${targetNoun(rule.target, opts)} next to it` : 'each item next to it';
      let sentence =
        rule.delta.mult !== undefined
          ? `Multiplies ${who} ×${mult(rule.delta.mult)}`
          : `Gives ${who} +${rule.delta.flat ?? 0}`;
      const extras: string[] = [];
      if (rule.makesSticky) extras.push('keeps them stuck in place');
      if (rule.preventsAging) extras.push('keeps them fresh');
      if (extras.length > 0) sentence += ` and ${extras.join(' and ')}`;
      return sentence;
    }
    case 'lonerBonus': {
      if (rule.delta.flat !== undefined) return `Earns +${rule.delta.flat} with nothing next to it`;
      if (rule.delta.mult !== undefined) return `Scores ×${mult(rule.delta.mult)} with nothing next to it`;
      return null;
    }
    case 'multIfAdjacentMinTotal':
      return `Scores ×${mult(rule.mult)} when everything next to it is worth at least ${rule.threshold}`;
    case 'echoLeftmostInRow':
      return 'Makes the leftmost item in its row score twice';
    case 'countdownVanish': {
      const gift =
        rule.grantAdjacent.mult !== undefined
          ? `×${mult(rule.grantAdjacent.mult)}`
          : `+${rule.grantAdjacent.flat ?? 0}`;
      const days = `${rule.days} ${rule.days === 1 ? 'day' : 'days'}`;
      return `Vanishes after ${days}, giving each item next to it ${gift} as it goes`;
    }
    case 'tagFilteredShelfMultiplier':
      return `Multiplies every ${rule.tag} item on the shelf ×${mult(rule.mult)}`;
    case 'flatPerTagCount':
      return `Earns +${rule.flatPerItem} for every ${rule.tag} item on the shelf`;
    case 'copyHighestScoringOther':
      return 'Matches the value of your highest-scoring other item';
    case 'shelfMultiplierIfAnyTagCount':
      return `Multiplies the whole shelf ×${mult(rule.mult)} when you have ${rule.minCount}+ of any one tag`;
    case 'highestBaseValueMultiplier':
      return `Multiplies your most valuable other item ×${mult(rule.mult)}`;
    default: {
      // Exhaustiveness guard: a new rule kind must add a sentence here.
      const _never: never = rule;
      return _never;
    }
  }
}

/**
 * Every rule on the item, as a short sentence — in rule order. An item with no
 * rules (or only rules with no narratable effect) yields the single neutral
 * fallback line, so the modal never renders an empty "WHAT IT DOES" block.
 */
export function describeItemRules(def: ItemDefinition, opts?: DescribeOptions): string[] {
  const sentences = def.rules
    .map((rule) => describeRule(rule, opts))
    .filter((line): line is string => line !== null && line.length > 0);
  return sentences.length > 0 ? sentences : [RULES_FALLBACK];
}
