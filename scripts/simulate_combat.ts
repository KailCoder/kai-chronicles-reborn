#!/usr/bin/env tsx
import { startCombat, autoResolve } from '../src/game/combat_engine';
import type { PlayerState } from '../src/game/types';

const enemyEvent = {
  type: 'combat',
  enemy: {
    id: 'giak',
    name: 'Giak Warrior',
    baseStats: { combatSkill: 15, endurance: 12 },
    traits: ['aggressive'],
  },
  victoryTarget: 88,
  defeatTarget: 350,
};

const player: PlayerState = {
  combatSkill: 12,
  endurance: 14,
  maxEndurance: 14,
  currentEndurance: 14,
  gold: 0,
  inventory: [],
  skills: [],
  flags: {},
};

function runOnce(seed?: number) {
  const active = startCombat(enemyEvent as any, player);
  const result = autoResolve(active as any, player, Math.random);

  console.log('Outcome:', result.outcome);
  console.log('Rounds:', result.history.length);
  result.history.forEach((r) => {
    console.log(
      `R${r.round}: P-roll=${r.playerRoll} E-roll=${r.enemyRoll} P-dmg=${r.playerDamage} E-dmg=${r.enemyDamage} P=${r.playerEnduranceAfter} E=${r.enemyEnduranceAfter}`,
    );
  });
}

const runs = Number(process.argv[2] ?? 1);
for (let i = 0; i < runs; i += 1) {
  console.log('--- Run', i + 1, '---');
  runOnce();
}
