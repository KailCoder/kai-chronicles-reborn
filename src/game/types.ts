export type SectionId = string;
export type ItemId = string;
export type SkillId = string;
export type FlagValue = boolean | number | string;

export type Condition =
  | { type: 'hasItem'; itemId: ItemId }
  | { type: 'hasSkill'; skillId: SkillId }
  | { type: 'minGold'; amount: number }
  | { type: 'minHealth'; amount: number }
  | { type: 'flagEquals'; flag: string; value: FlagValue };

export type Effect =
  | { type: 'changeHealth'; amount: number }
  | { type: 'setHealth'; value: number }
  | { type: 'changeGold'; amount: number }
  | { type: 'addItem'; itemId: ItemId }
  | { type: 'removeItem'; itemId: ItemId }
  | { type: 'addSkill'; skillId: SkillId }
  | { type: 'setFlag'; flag: string; value: FlagValue }
  | { type: 'clearFlag'; flag: string };

export interface Choice {
  id: string;
  text: string;
  targetSectionId: SectionId;
  conditions?: Condition[];
  effects?: Effect[];
}

export interface Section {
  id: SectionId;
  title?: string;
  text: string;
  onEnterEffects?: Effect[];
  choices: Choice[];
}

export interface Story {
  startSectionId: SectionId;
  sections: Record<SectionId, Section>;
}

export interface CombatEnemy {
  name: string;
  combatSkill: number;
  endurance: number;
  rewardEffects?: Effect[];
}

export interface CombatEncounter {
  enemy: CombatEnemy;
  winTargetSectionId?: SectionId;
  loseTargetSectionId?: SectionId;
}

export interface PlayerState {
  health: number;
  maxHealth: number;
  combatSkill: number;
  gold: number;
  inventory: ItemId[];
  skills: SkillId[];
  flags: Record<string, FlagValue>;
}

export interface GameState {
  currentSectionId: SectionId;
  player: PlayerState;
  visitedSectionIds: SectionId[];
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