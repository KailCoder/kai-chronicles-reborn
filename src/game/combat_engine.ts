import type {
  ActiveCombatState,
  CombatConfig,
  CombatRound,
  CombatResult,
  EnemyDefinition,
  GameState,
  PlayerState,
  CombatEvent,
} from './types';

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
) {
  const damagePerHit = config.damagePerHit ?? 2;

  const playerCurrent = player.currentEndurance ?? player.endurance;
  let enemyCurrent = active.enemyEndurance;
  let playerAfter = playerCurrent;

  const playerRoll = player.combatSkill + rollTwoD6(random);
  const enemyRoll = active.event.enemy.baseStats.combatSkill + rollTwoD6(random);

  let playerDamage = 0;
  let enemyDamage = 0;

  // simple trait hooks
  const enemyTraits = active.event.enemy.traits ?? [];
  const enemyArmored = enemyTraits.includes('armored') || enemyTraits.includes('light-armored');
  const enemyStrong = enemyTraits.includes('strong');

  if (playerRoll > enemyRoll) {
    enemyDamage = damagePerHit + (player.combatSkill > 12 ? 1 : 0);
    if (enemyArmored) enemyDamage = Math.max(1, enemyDamage - 1);
    enemyCurrent = Math.max(0, enemyCurrent - enemyDamage);
  } else if (enemyRoll > playerRoll) {
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

  return { active: nextActive, player: nextPlayer, finished };
}

export function autoResolve(
  active: ActiveCombatState,
  player: PlayerState,
  random: RandomSource = defaultRandom,
  config: CombatConfig = {},
): CombatResult & { player: PlayerState } {
  let loopActive = active;
  let loopPlayer = { ...player };

  while ((loopPlayer.currentEndurance ?? loopPlayer.endurance) > 0 && loopActive.enemyEndurance > 0) {
    const step = stepCombat(loopActive, loopPlayer, random, config);
    loopActive = step.active;
    loopPlayer = step.player;

    if (step.finished) break;
  }

  const outcome = (loopActive.enemyEndurance <= 0 && (loopPlayer.currentEndurance ?? loopPlayer.endurance) > 0) ? 'victory' : 'defeat';

  const result: CombatResult = {
    outcome,
    finalState: undefined as unknown as GameState,
    history: loopActive.history,
  };

  return Object.assign(result, { player: loopPlayer });
}

function rollTwoD6(random: RandomSource): number {
  return rollD6(random) + rollD6(random);
}

function rollD6(random: RandomSource): number {
  return Math.floor(random() * 6) + 1;
}
