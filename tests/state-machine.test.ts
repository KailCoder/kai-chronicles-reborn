import introFlowData from '../src/content/lobo1-intro.json';
import { advanceIntro, createIntroSession, getCurrentIntroStep, toggleIntroSkill, type IntroFlow } from '../src/game/flow';
import { startStory } from '../src/game/engine';
import { resolveCombatEncounter } from '../src/game/combat';
import { clearGameState, loadGameState, saveGameState } from '../src/game/persistence';
import type { CombatEvent, PlayerState, Story } from '../src/game/types';
import { createSequenceRandom } from './helpers';

const introFlow = introFlowData as IntroFlow;

function createPlayer(): PlayerState {
  return {
    combatSkill: 10,
    endurance: 10,
    maxEndurance: 10,
    currentEndurance: 10,
    gold: 0,
    inventory: [],
    skills: [],
    flags: {},
  };
}

function createLocalStorageMock() {
  const store = new Map<string, string>();

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
  };
}

function createCombatStory(): Story {
  const combatEvent: CombatEvent = {
    type: 'combat',
    enemy: {
      name: 'Giak',
      baseStats: { combatSkill: 8, endurance: 4 },
      traits: [],
    },
    victoryTarget: 2,
    defeatTarget: 3,
  };

  return {
    id: 'combat-story',
    startSectionId: 1,
    sections: {
      '1': {
        id: 1,
        title: 'Encounter',
        text: ['A Giak emerges from the trees.'],
        choices: [],
        events: [combatEvent],
      },
      '2': {
        id: 2,
        title: 'Victory',
        text: ['You win.'],
        choices: [],
      },
      '3': {
        id: 3,
        title: 'Defeat',
        text: ['You lose.'],
        choices: [],
      },
    },
  };
}

function createIntroStory(): Story {
  return {
    id: 'intro-story',
    startSectionId: 1,
    sections: {
      '1': { id: 1, text: ['start'], choices: [] },
    },
  };
}

describe('state machine and persistence', () => {
  beforeEach(() => {
    (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage = createLocalStorageMock() as unknown as Storage;
  });

  afterEach(() => {
    clearGameState();
  });

  it('advances intro to gameplay with selected skills preserved', () => {
    let session = createIntroSession(introFlow.bookId, createPlayer());
    const story = createIntroStory();

    expect(getCurrentIntroStep(session, introFlow).kind).toBe('text');

    session = advanceIntro(session, introFlow, story);
    session = advanceIntro(session, introFlow, story);
    session = advanceIntro(session, introFlow, story);

    expect(getCurrentIntroStep(session, introFlow).kind).toBe('skill_selection');

    for (const skill of ['Camouflage', 'Hunting', 'Sixth Sense', 'Tracking', 'Healing'] as const) {
      session = toggleIntroSkill(session, skill, introFlow);
    }

    session = advanceIntro(session, introFlow, story);
    session = advanceIntro(session, introFlow, story);

    expect(session.phase).toBe('playing');
    expect(session.gameState?.currentSectionId).toBe(1);
    expect(session.selectedSkills).toHaveLength(5);
    expect(session.gameState?.player.skills).toEqual(expect.arrayContaining(['Camouflage', 'Hunting', 'Sixth Sense', 'Tracking', 'Healing']));
  });

  it('transitions gameplay into combat and back into gameplay', () => {
    const story = createCombatStory();
    const start = startStory(story, createPlayer());

    expect(start.state.activeCombat).not.toBeNull();

    const resolved = resolveCombatEncounter(story, start.state, createSequenceRandom([0, 0, 0, 0]));

    expect(resolved.currentSectionId).toBe(2);
    expect(resolved.activeCombat).toBeNull();
  });

  it('persists and restores the same session state for the same story id', () => {
    const session = createIntroSession('book-1', createPlayer());

    saveGameState(session, 'book-1');

    const loaded = loadGameState('book-1');

    expect(loaded?.storyId).toBe('book-1');
    expect(loaded?.state).toEqual(session);
    expect(loadGameState('other-book')).toBeNull();
  });
});