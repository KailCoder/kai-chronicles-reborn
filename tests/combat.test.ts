import { autoResolve, startCombat } from '../src/game/combat_engine';
import type { CombatEvent, PlayerState } from '../src/game/types';
import { createSequenceRandom } from './helpers';

function createPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    combatSkill: 12,
    endurance: 14,
    maxEndurance: 14,
    currentEndurance: 14,
    gold: 0,
    inventory: [],
    skills: [],
    flags: {},
    ...overrides,
  };
}

function createCombatEvent(overrides: Partial<CombatEvent> = {}): CombatEvent {
  return {
    type: 'combat',
    enemy: {
      id: 'giak',
      name: 'Giak',
      baseStats: {
        combatSkill: 10,
        endurance: 6,
      },
      traits: [],
    },
    victoryTarget: 88,
    defeatTarget: 350,
    ...overrides,
  };
}

describe('combat engine', () => {
  it('always resolves a stronger player against a weaker enemy', () => {
    const active = startCombat(
      createCombatEvent({
        enemy: {
          id: 'giak',
          name: 'Giak',
          baseStats: { combatSkill: 10, endurance: 6 },
          traits: [],
        },
      }),
      createPlayer({ combatSkill: 16 }),
    );

    const result = autoResolve(active, createPlayer({ combatSkill: 16 }), createSequenceRandom([0, 0, 0, 0, 0, 0]));

    expect(result.outcome).toBe('victory');
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.enemyEndurance).toBe(0);
    expect(result.finalPlayer.endurance).toBeGreaterThan(0);
  });

  it('resolves defeat for a weaker player against a stronger enemy', () => {
    const active = startCombat(
      createCombatEvent({
        enemy: {
          id: 'vordak',
          name: 'Vordak',
          baseStats: { combatSkill: 16, endurance: 6 },
          traits: ['strong'],
        },
      }),
      createPlayer({ combatSkill: 10, endurance: 6, maxEndurance: 6, currentEndurance: 6 }),
    );

    const result = autoResolve(active, createPlayer({ combatSkill: 10, endurance: 6, maxEndurance: 6, currentEndurance: 6 }), createSequenceRandom([0, 0, 0, 0]));

    expect(result.outcome).toBe('defeat');
    expect(result.history.length).toBeGreaterThan(0);
    expect(result.finalPlayer.endurance).toBe(0);
  });

  it('terminates on equal stats by applying the tie break rule', () => {
    const active = startCombat(createCombatEvent({ enemy: { name: 'Giak', baseStats: { combatSkill: 12, endurance: 4 }, traits: [] } }), createPlayer({ combatSkill: 12 }));

    const result = autoResolve(active, createPlayer({ combatSkill: 12 }), createSequenceRandom([0, 0, 0, 0]));

    expect(result.history.length).toBe(2);
    expect(result.outcome).toBe('victory');
    expect(result.enemyEndurance).toBe(0);
  });

  it('returns a valid zero-round defeat when the player is already at zero endurance', () => {
    const active = startCombat(createCombatEvent(), createPlayer({ endurance: 0, maxEndurance: 6, currentEndurance: 0 }));

    const result = autoResolve(active, createPlayer({ endurance: 0, maxEndurance: 6, currentEndurance: 0 }), createSequenceRandom([0, 0]));

    expect(result.outcome).toBe('defeat');
    expect(result.history).toEqual([]);
    expect(result.finalPlayer.endurance).toBe(0);
  });

  it('always includes the outcome and final combat stats', () => {
    const active = startCombat(createCombatEvent(), createPlayer());
    const result = autoResolve(active, createPlayer(), createSequenceRandom([0, 0, 0, 0]));

    expect(result).toMatchObject({
      outcome: expect.any(String),
      finalPlayer: expect.objectContaining({ combatSkill: expect.any(Number), endurance: expect.any(Number) }),
      enemyEndurance: expect.any(Number),
      history: expect.any(Array),
    });
  });
});