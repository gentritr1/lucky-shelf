import type { GamePhase, GameState, ScoringTrace } from '../contracts';

export type RunRoute = '/draft' | '/run' | '/restock' | '/summary';

export interface CascadeMount {
  gameState: GameState;
  trace: ScoringTrace;
  nextRoute: RunRoute;
  rentDue: boolean;
}

export function routeForPhase(phase: GamePhase): RunRoute {
  switch (phase) {
    case 'delivery':
      return '/draft';
    case 'arrange':
    case 'openShop':
      return '/run';
    case 'restock':
      return '/restock';
    case 'gameOver':
      return '/summary';
  }
}

export function routeForGameState(gameState: GameState): RunRoute {
  return routeForPhase(gameState.phase);
}

export function cascadeMountAfterOpenShop(beforeOpenShop: GameState, afterOpenShop: GameState): CascadeMount {
  if (!afterOpenShop.lastScoringTrace) {
    throw new Error('openShop did not produce a scoring trace.');
  }

  return {
    gameState: beforeOpenShop,
    trace: afterOpenShop.lastScoringTrace,
    nextRoute: routeForGameState(afterOpenShop),
    rentDue: beforeOpenShop.rent.dueInDays === 1,
  };
}
