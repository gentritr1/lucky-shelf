import { describe, expect, it } from 'vitest';

import { isOnboardingStep, laterOnboardingStep } from './onboardingStore';

describe('contextual onboarding progression', () => {
  it('accepts only persisted v3 stages', () => {
    for (const step of ['supplier', 'draft', 'place', 'open', 'done']) {
      expect(isOnboardingStep(step)).toBe(true);
    }
    expect(isOnboardingStep('seen')).toBe(false);
    expect(isOnboardingStep('')).toBe(false);
    expect(isOnboardingStep(null)).toBe(false);
  });

  it('moves forward to the stage implied by real game state', () => {
    expect(laterOnboardingStep('supplier', 'draft')).toBe('draft');
    expect(laterOnboardingStep('draft', 'place')).toBe('place');
    expect(laterOnboardingStep('place', 'open')).toBe('open');
    expect(laterOnboardingStep('open', 'done')).toBe('done');
  });

  it('never regresses a resumed or completed tour', () => {
    expect(laterOnboardingStep('open', 'draft')).toBe('open');
    expect(laterOnboardingStep('done', 'supplier')).toBe('done');
    expect(laterOnboardingStep('place', 'place')).toBe('place');
  });
});
