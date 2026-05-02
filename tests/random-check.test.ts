import { enterSection, getAvailableChoices } from '../src/game/engine';
import { resolveRandomCheck } from '../src/game/random_resolution';
import type { PlayerState, Story } from '../src/game/types';

function createPlayer(): PlayerState {
  return {
    combatSkill: 10,
    endurance: 10,
    maxEndurance: 10,
    gold: 0,
    inventory: [],
    skills: [],
    flags: {},
  };
}

function createRandomCheckStory(): Story {
  return {
    id: 'random-check-story',
    startSectionId: 1,
    sections: {
      '1': {
        id: 1,
        type: 'random_check',
        title: 'The Blind Gate',
        text: ['Choose your fate.'],
        prompt: 'Pick a hidden number and discover your fate',
        outcomes: {
          '0': 2,
          '1': 3,
          '2': 4,
          '3': 5,
          '4': 6,
          '5': 7,
          '6': 8,
          '7': 9,
          '8': 10,
          '9': 11,
        },
      },
      '2': { id: 2, text: ['Outcome 2'], choices: [] },
      '3': { id: 3, text: ['Outcome 3'], choices: [] },
      '4': { id: 4, text: ['Outcome 4'], choices: [] },
      '5': { id: 5, text: ['Outcome 5'], choices: [] },
      '6': { id: 6, text: ['Outcome 6'], choices: [] },
      '7': { id: 7, text: ['Outcome 7'], choices: [] },
      '8': { id: 8, text: ['Outcome 8'], choices: [] },
      '9': { id: 9, text: ['Outcome 9'], choices: [] },
      '10': { id: 10, text: ['Outcome 10'], choices: [] },
      '11': { id: 11, text: ['Outcome 11'], choices: [] },
    },
  };
}

describe('random-check sections', () => {
  it('activate a blind random check when entered and hide normal choices', () => {
    const story = createRandomCheckStory();
    const entered = enterSection(story, { currentSectionId: 1, player: createPlayer(), visitedSectionIds: [], activeCombat: null, activeRandomCheck: null }, 1);

    expect(entered.state.activeRandomCheck).not.toBeNull();
    expect(entered.state.activeRandomCheck?.prompt).toContain('hidden number');
    expect(getAvailableChoices(entered.section, entered.state)).toHaveLength(0);
  });

  it('maps the selected value to the configured outcome target', () => {
    const story = createRandomCheckStory();
    const entered = enterSection(story, { currentSectionId: 1, player: createPlayer(), visitedSectionIds: [], activeCombat: null, activeRandomCheck: null }, 1);

    const target = resolveRandomCheck(entered.state.activeRandomCheck!.outcomes, 7);

    expect(target).toBe(9);
  });
});