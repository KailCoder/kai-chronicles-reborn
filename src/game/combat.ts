import type { GameState, Story } from './types';
import { applyEffects, enterSection } from './engine';
import { autoResolve, stepCombat } from './combat_engine';

type RandomSource = () => number;

export function resolveCombatEncounter(story: Story, state: GameState, random: RandomSource = Math.random): GameState {
  if (!state.activeCombat) {
    throw new Error('No active combat to resolve.');
  }

  const active = state.activeCombat;

  const result = autoResolve(active, state.player, random);

  // update player in the game state
  const updatedPlayer = {
    ...state.player,
    endurance: Math.max(0, Math.min(state.player.maxEndurance, result.player.currentEndurance ?? state.player.endurance)),
  };

  const clearedCombatState: GameState = {
    ...state,
    player: updatedPlayer,
    activeCombat: null,
  };

  if (result.outcome === 'victory') {
    const rewarded = applyEffects(clearedCombatState, active.event.rewardEffects);
    return enterSection(story, rewarded, active.event.victoryTarget).state;
  }

  return enterSection(story, clearedCombatState, active.event.defeatTarget).state;
}

export function stepCombatEncounter(story: Story, state: GameState, random: RandomSource = Math.random): GameState {
  if (!state.activeCombat) {
    throw new Error('No active combat to step.');
  }

  const active = state.activeCombat;
  const step = stepCombat(active, state.player, random);

  // update transient player currentEndurance and active combat
  const interimState: GameState = {
    ...state,
    player: {
      ...state.player,
      currentEndurance: step.player.currentEndurance ?? state.player.currentEndurance,
    },
    activeCombat: step.active,
  };

  if (!step.finished) {
    return interimState;
  }

  // combat finished: determine final outcome and transition
  const updatedPlayer = {
    ...interimState.player,
    endurance: Math.max(0, Math.min(interimState.player.maxEndurance, interimState.player.currentEndurance ?? interimState.player.endurance)),
    currentEndurance: undefined,
  };

  const clearedCombatState: GameState = {
    ...interimState,
    player: updatedPlayer,
    activeCombat: null,
  };

  if (step.active.enemyEndurance <= 0) {
    const rewarded = applyEffects(clearedCombatState, active.event.rewardEffects);
    return enterSection(story, rewarded, active.event.victoryTarget).state;
  }

  return enterSection(story, clearedCombatState, active.event.defeatTarget).state;
}