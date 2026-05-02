import {
  Choice,
  ChoiceResult,
  Effect,
  EnterSectionResult,
  GameState,
  PlayerState,
  SectionId,
  Section,
  Requirement,
  Story,
} from './types';
import { startRandomCheck, type RandomResolutionConfig } from './random_resolution';

export function createInitialState(startSectionId: SectionId, player: PlayerState): GameState {
  return {
    currentSectionId: startSectionId,
    player: {
      ...player,
      inventory: [...player.inventory],
      skills: [...player.skills],
      flags: { ...player.flags },
    },
    visitedSectionIds: [],
    activeCombat: null,
    activeRandomCheck: null,
  };
}

export function getSection(story: Story, sectionId: SectionId): Section {
  const section = story.sections[String(sectionId)];

  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  return section;
}

export function applyEffects(state: GameState, effects: Effect[] = []): GameState {
  const nextPlayer = { ...state.player };

  for (const effect of effects) {
    switch (effect.type) {
      case 'damage':
        nextPlayer.endurance = clamp(nextPlayer.endurance - effect.amount, 0, nextPlayer.maxEndurance);
        break;
      case 'heal':
        nextPlayer.endurance = clamp(nextPlayer.endurance + effect.amount, 0, nextPlayer.maxEndurance);
        break;
      case 'add_item':
        if (!nextPlayer.inventory.includes(effect.item)) {
          nextPlayer.inventory = [...nextPlayer.inventory, effect.item];
        }
        break;
      case 'remove_item':
        nextPlayer.inventory = nextPlayer.inventory.filter((itemId) => itemId !== effect.item);
        break;
      case 'add_gold':
        nextPlayer.gold = Math.max(0, nextPlayer.gold + effect.amount);
        break;
      case 'remove_gold':
        nextPlayer.gold = Math.max(0, nextPlayer.gold - effect.amount);
        break;
      case 'set_stat':
        if (effect.stat === 'combatSkill') {
          nextPlayer.combatSkill = effect.value;
        } else if (effect.stat === 'endurance') {
          nextPlayer.endurance = clamp(effect.value, 0, nextPlayer.maxEndurance);
        } else if (effect.stat === 'gold') {
          nextPlayer.gold = Math.max(0, effect.value);
        }
        break;
      case 'set_flag':
        nextPlayer.flags = { ...nextPlayer.flags, [effect.key]: effect.value };
        break;
      case 'clear_flag': {
        const { [effect.key]: _removedFlag, ...remainingFlags } = nextPlayer.flags;
        nextPlayer.flags = remainingFlags;
        break;
      }
      default:
        break;
    }
  }

  return { ...state, player: nextPlayer };
}

export function canUseChoice(state: GameState, choice: Choice): boolean {
  return (choice.requirements ?? []).every((requirement) => matchesRequirement(state, requirement));
}

export function getAvailableChoices(section: Section, state: GameState): Choice[] {
  if (state.activeCombat || state.activeRandomCheck || section.type === 'random_check') {
    return [];
  }

  return section.choices.filter((choice) => canUseChoice(state, choice));
}

export function enterSection(story: Story, state: GameState, sectionId: SectionId): EnterSectionResult {
  const section = getSection(story, sectionId);
  const afterEffects = applyEffects(state, section.effects);
  const nextState = {
    ...afterEffects,
    activeCombat: null,
    activeRandomCheck: null,
  };

  if (section.type === 'random_check') {
    return {
      section,
      state: {
        ...nextState,
        currentSectionId: sectionId,
        activeRandomCheck: startRandomCheck(section, {}),
        visitedSectionIds: state.visitedSectionIds.includes(sectionId)
          ? state.visitedSectionIds
          : [...state.visitedSectionIds, sectionId],
      },
    };
  }

  const combatEvent = section.events?.find((event): event is Extract<(typeof section.events)[number], { type: 'combat' }> => event.type === 'combat');
  const withCombat = combatEvent
    ? {
        ...nextState,
        activeCombat: {
          event: combatEvent,
          enemyEndurance: combatEvent.enemy.baseStats.endurance,
          round: 0,
          history: [],
        },
      }
    : nextState;

  return {
    section,
    state: {
      ...withCombat,
      currentSectionId: sectionId,
      visitedSectionIds: state.visitedSectionIds.includes(sectionId)
        ? state.visitedSectionIds
        : [...state.visitedSectionIds, sectionId],
    },
  };
}

export function choose(story: Story, state: GameState, choiceId: string): ChoiceResult {
  if (state.activeRandomCheck) {
    throw new Error('Cannot choose a story option while a random check is active.');
  }

  const section = getSection(story, state.currentSectionId);
  if (section.type === 'random_check') {
    throw new Error('Random-check sections do not use story choices.');
  }

  const choice = section.choices.find((candidate) => candidate.id === choiceId);

  if (!choice) {
    throw new Error(`Unknown choice: ${choiceId}`);
  }

  if (!canUseChoice(state, choice)) {
    throw new Error(`Choice is not available: ${choiceId}`);
  }

  const afterChoiceEffects = applyEffects(state, choice.effects);
  const entered = enterSection(story, afterChoiceEffects, choice.target);

  return {
    choice,
    section: entered.section,
    state: entered.state,
  };
}

export function startStory(story: Story, player: PlayerState): EnterSectionResult {
  const initialState = createInitialState(story.startSectionId, player);
  return enterSection(story, initialState, story.startSectionId);
}

function matchesRequirement(state: GameState, requirement: Requirement): boolean {
  switch (requirement.type) {
    case 'item':
      return state.player.inventory.includes(requirement.value);
    case 'skill':
      return state.player.skills.includes(requirement.value);
    case 'min_gold':
      return state.player.gold >= requirement.value;
    case 'min_stat':
      return state.player[requirement.stat] >= requirement.value;
    case 'flag':
      return requirement.value === undefined
        ? Boolean(state.player.flags[requirement.key])
        : state.player.flags[requirement.key] === requirement.value;
    default:
      return false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}