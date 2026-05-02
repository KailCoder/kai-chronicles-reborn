import type {
  ActiveCombatState,
  CombatConfig,
  CombatRound,
  CombatResult,
  CombatStepResult,
  PlayerState,
  CombatEvent,
} from './types';
import { createBlindRandomState, drawRandomNumber, type BlindRandomState, type RandomMode } from './random';

type RandomSource = () => number;

function defaultRandom(): number {
  return Math.random();
}

export function startCombat(event: CombatEvent, player: PlayerState): ActiveCombatState {
  const enemyEndurance = event.enemy.baseStats.endurance;

  return {
    event,
    enemyEndurance,
    round: 0,
    history: [],
  };
}

export function stepCombat(
  active: ActiveCombatState,
  player: PlayerState,
  random: RandomSource = defaultRandom,
  config: CombatConfig = {},
): CombatStepResult {
  const damagePerHit = config.damagePerHit ?? 2;
  const randomMode: RandomMode = config.randomMode ?? 'fast';
  let blindRandomState = config.blindRandomState ?? (randomMode === 'classic' ? createBlindRandomState(random) : undefined);

  const playerCurrent = player.currentEndurance ?? player.endurance;
  let enemyCurrent = active.enemyEndurance;
  let playerAfter = playerCurrent;

  const playerRollResult = rollTwoD6(random, randomMode, blindRandomState);
  blindRandomState = playerRollResult.blindRandomState ?? blindRandomState;
  const enemyRollResult = rollTwoD6(random, randomMode, blindRandomState);
  blindRandomState = enemyRollResult.blindRandomState ?? blindRandomState;

  const playerRoll = player.combatSkill + playerRollResult.value;
  const enemyRoll = active.event.enemy.baseStats.combatSkill + enemyRollResult.value;

  let playerDamage = 0;
  let enemyDamage = 0;

  // simple trait hooks
  const enemyTraits = active.event.enemy.traits ?? [];
  const enemyArmored = enemyTraits.includes('armored') || enemyTraits.includes('light-armored');
  const enemyStrong = enemyTraits.includes('strong');

  if (playerRoll >= enemyRoll) {
    enemyDamage = damagePerHit + (player.combatSkill > 12 ? 1 : 0);
    if (enemyArmored) enemyDamage = Math.max(1, enemyDamage - 1);
    enemyCurrent = Math.max(0, enemyCurrent - enemyDamage);
  } else {
    playerDamage = damagePerHit + (enemyStrong ? 1 : 0);
    playerAfter = Math.max(0, playerAfter - playerDamage);
  }

  const nextRound = active.round + 1;

  const roundRecord: CombatRound = {
    round: nextRound,
    playerRoll,
    enemyRoll,
    playerDamage,
    enemyDamage,
    playerEnduranceAfter: playerAfter,
    enemyEnduranceAfter: enemyCurrent,
  };

  const nextActive: ActiveCombatState = {
    ...active,
    enemyEndurance: enemyCurrent,
    round: nextRound,
    history: [...active.history, roundRecord],
  };

  const nextPlayer: PlayerState = {
    ...player,
    currentEndurance: playerAfter,
  };

  const finished = playerAfter <= 0 || enemyCurrent <= 0;

  return { active: nextActive, player: nextPlayer, finished, blindRandomState };
}

export function autoResolve(
  active: ActiveCombatState,
  player: PlayerState,
  random: RandomSource = defaultRandom,
  config: CombatConfig = {},
): CombatResult & { player: PlayerState } {
  let loopActive = active;
  let loopPlayer = { ...player };
  let blindRandomState = config.blindRandomState;

  if ((config.randomMode ?? 'fast') === 'classic' && !blindRandomState) {
    blindRandomState = createBlindRandomState(random);
  }

  while ((loopPlayer.currentEndurance ?? loopPlayer.endurance) > 0 && loopActive.enemyEndurance > 0) {
    const step = stepCombat(loopActive, loopPlayer, random, {
      ...config,
      blindRandomState,
    });
    loopActive = step.active;
    loopPlayer = step.player;
    blindRandomState = step.blindRandomState ?? blindRandomState;

    if (step.finished) break;
  }

  const outcome = (loopActive.enemyEndurance <= 0 && (loopPlayer.currentEndurance ?? loopPlayer.endurance) > 0) ? 'victory' : 'defeat';

  const result: CombatResult = {
    outcome,
    finalPlayer: {
      ...loopPlayer,
      endurance: loopPlayer.currentEndurance ?? loopPlayer.endurance,
    },
    enemyEndurance: loopActive.enemyEndurance,
    history: loopActive.history,
  };

  return Object.assign(result, { player: loopPlayer });
}

function rollTwoD6(random: RandomSource, mode: RandomMode, blindRandomState?: BlindRandomState): { value: number; blindRandomState?: BlindRandomState } {
  const first = rollD6(random, mode, blindRandomState);
  const second = rollD6(random, mode, first.blindRandomState ?? blindRandomState);

  return {
    value: first.value + second.value,
    blindRandomState: second.blindRandomState ?? first.blindRandomState ?? blindRandomState,
  };
}

function rollD6(
  random: RandomSource,
  mode: RandomMode,
  blindRandomState?: BlindRandomState,
): { value: number; blindRandomState?: BlindRandomState } {
  const selection = drawRandomNumber(mode, {
    state: blindRandomState,
    randomSource: random,
  });

  return {
    value: (selection.value % 6) + 1,
    blindRandomState: selection.state,
  };
}
