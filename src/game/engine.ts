import {
  Choice,
  ChoiceResult,
  Condition,
  Effect,
  EnterSectionResult,
  GameState,
  PlayerState,
  Section,
  Story,
} from './types';

export function createInitialState(startSectionId: string, player: PlayerState): GameState {
  return {
    currentSectionId: startSectionId,
    player: {
      ...player,
      inventory: [...player.inventory],
      skills: [...player.skills],
      flags: { ...player.flags },
    },
    visitedSectionIds: [],
  };
}

export function getSection(story: Story, sectionId: string): Section {
  const section = story.sections[sectionId];

  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  return section;
}

export function applyEffects(state: GameState, effects: Effect[] = []): GameState {
  const nextPlayer = { ...state.player };

  for (const effect of effects) {
    switch (effect.type) {
      case 'changeHealth':
        nextPlayer.health = clamp(nextPlayer.health + effect.amount, 0, nextPlayer.maxHealth);
        break;
      case 'setHealth':
        nextPlayer.health = clamp(effect.value, 0, nextPlayer.maxHealth);
        break;
      case 'changeGold':
        nextPlayer.gold = Math.max(0, nextPlayer.gold + effect.amount);
        break;
      case 'addItem':
        if (!nextPlayer.inventory.includes(effect.itemId)) {
          nextPlayer.inventory = [...nextPlayer.inventory, effect.itemId];
        }
        break;
      case 'removeItem':
        nextPlayer.inventory = nextPlayer.inventory.filter((itemId) => itemId !== effect.itemId);
        break;
      case 'addSkill':
        if (!nextPlayer.skills.includes(effect.skillId)) {
          nextPlayer.skills = [...nextPlayer.skills, effect.skillId];
        }
        break;
      case 'setFlag':
        nextPlayer.flags = { ...nextPlayer.flags, [effect.flag]: effect.value };
        break;
      case 'clearFlag': {
        const { [effect.flag]: _removedFlag, ...remainingFlags } = nextPlayer.flags;
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
  return (choice.conditions ?? []).every((condition) => matchesCondition(state, condition));
}

export function getAvailableChoices(section: Section, state: GameState): Choice[] {
  return section.choices.filter((choice) => canUseChoice(state, choice));
}

export function enterSection(story: Story, state: GameState, sectionId: string): EnterSectionResult {
  const section = getSection(story, sectionId);
  const nextState = applyEffects(state, section.onEnterEffects);

  return {
    section,
    state: {
      ...nextState,
      currentSectionId: sectionId,
      visitedSectionIds: state.visitedSectionIds.includes(sectionId)
        ? state.visitedSectionIds
        : [...state.visitedSectionIds, sectionId],
    },
  };
}

export function choose(story: Story, state: GameState, choiceId: string): ChoiceResult {
  const section = getSection(story, state.currentSectionId);
  const choice = section.choices.find((candidate) => candidate.id === choiceId);

  if (!choice) {
    throw new Error(`Unknown choice: ${choiceId}`);
  }

  if (!canUseChoice(state, choice)) {
    throw new Error(`Choice is not available: ${choiceId}`);
  }

  const afterChoiceEffects = applyEffects(state, choice.effects);
  const entered = enterSection(story, afterChoiceEffects, choice.targetSectionId);

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

function matchesCondition(state: GameState, condition: Condition): boolean {
  switch (condition.type) {
    case 'hasItem':
      return state.player.inventory.includes(condition.itemId);
    case 'hasSkill':
      return state.player.skills.includes(condition.skillId);
    case 'minGold':
      return state.player.gold >= condition.amount;
    case 'minHealth':
      return state.player.health >= condition.amount;
    case 'flagEquals':
      return state.player.flags[condition.flag] === condition.value;
    default:
      return false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}