export type SectionId = string | number;
export type ItemId = string;
export type SkillId = string;
export type FlagValue = boolean | number | string;
export type StatName = 'combatSkill' | 'endurance' | 'gold';

export type Requirement =
  | { type: 'item'; value: ItemId }
  | { type: 'skill'; value: SkillId }
  | { type: 'min_gold'; value: number }
  | { type: 'min_stat'; stat: StatName; value: number }
  | { type: 'flag'; key: string; value?: FlagValue };

export type Effect =
  | { type: 'damage'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'add_item'; item: ItemId }
  | { type: 'remove_item'; item: ItemId }
  | { type: 'add_gold'; amount: number }
  | { type: 'remove_gold'; amount: number }
  | { type: 'set_stat'; stat: StatName; value: number }
  | { type: 'set_flag'; key: string; value: FlagValue }
  | { type: 'clear_flag'; key: string };

export interface Choice {
  id?: string;
  text: string;
  target: SectionId;
  requirements?: Requirement[];
  effects?: Effect[];
}

export type Trait = string;

export interface EnemyDefinition {
  id?: string;
  name: string;
  baseStats: {
    combatSkill: number;
    endurance: number;
  };
  traits?: Trait[];
  loot?: ItemId[];
  // reserved for future special behavior definitions
  behaviors?: Record<string, any>;
}

export interface CombatEvent {
  type: 'combat';
  enemy: EnemyDefinition;
  victoryTarget: SectionId;
  defeatTarget: SectionId;
  rewardEffects?: Effect[];
}

export type SectionEvent = CombatEvent;

export interface Section {
  id: SectionId;
  title?: string;
  text: string[];
  effects?: Effect[];
  choices: Choice[];
  events?: SectionEvent[];
}

export interface Story {
  id?: string;
  startSectionId: SectionId;
  sections: Record<string, Section>;
}

export interface PlayerState {
  combatSkill: number;
  // `endurance` remains for compatibility as the player's base endurance stat.
  endurance: number;
  maxEndurance: number;
  // currentEndurance can be used by combat systems to track transient HP separate from base stat
  currentEndurance?: number;
  gold: number;
  inventory: ItemId[];
  skills: SkillId[];
  flags: Record<string, FlagValue>;
}

export interface CombatRound {
  round: number;
  playerRoll: number;
  enemyRoll: number;
  playerDamage: number;
  enemyDamage: number;
  playerEnduranceAfter: number;
  enemyEnduranceAfter: number;
}

export interface ActiveCombatState {
  event: CombatEvent;
  enemyEndurance: number;
  round: number;
  history: CombatRound[];
}

export interface CombatConfig {
  damagePerHit?: number; // default 2
  randomSeed?: number | string; // optional seed for deterministic RNG in tests
}

export interface CombatResult {
  outcome: 'victory' | 'defeat';
  finalState: GameState;
  history: CombatRound[];
}

export interface GameState {
  currentSectionId: SectionId;
  player: PlayerState;
  visitedSectionIds: SectionId[];
  activeCombat: ActiveCombatState | null;
}

export interface EnterSectionResult {
  section: Section;
  state: GameState;
}

export interface ChoiceResult {
  choice: Choice;
  section: Section;
  state: GameState;
}