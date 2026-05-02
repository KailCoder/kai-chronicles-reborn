import { validateCombatEvent, validateSection, validateStory } from '../src/game/validation';
import type { CombatEvent, Section, Story } from '../src/game/types';

function createValidStory(): Story {
  const combatEvent: CombatEvent = {
    type: 'combat',
    enemy: {
      name: 'Giak',
      baseStats: { combatSkill: 10, endurance: 6 },
      traits: ['aggressive'],
    },
    victoryTarget: 2,
    defeatTarget: 3,
  };

  const section: Section = {
    id: 1,
    title: 'Start',
    text: ['A corridor opens ahead.'],
    choices: [{ id: 'go', text: 'Continue', target: 2 }],
    events: [combatEvent],
  };

  return {
    id: 'story',
    startSectionId: 1,
    sections: {
      '1': section,
      '2': { id: 2, title: 'Win', text: ['Victory.'], choices: [] },
      '3': { id: 3, title: 'Lose', text: ['Defeat.'], choices: [] },
    },
  };
}

describe('validation layer', () => {
  it('accepts a valid story with linked choices and combat targets', () => {
    const result = validateStory(createValidStory());

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('reports invalid choice targets and combat enemy stats', () => {
    const invalidSection: Section = {
      id: 1,
      title: 'Broken',
      text: ['Something is wrong.'],
      choices: [{ id: 'bad', text: 'Broken choice', target: 99 }],
      events: [
        {
          type: 'combat',
          enemy: {
            name: '',
            baseStats: { combatSkill: -1, endurance: 0 },
          },
          victoryTarget: 2,
          defeatTarget: 3,
        },
      ],
    };

    const sectionResult = validateSection(invalidSection);

    expect(sectionResult.valid).toBe(false);
    expect(sectionResult.issues.some((issue) => issue.path.includes('enemy.name'))).toBe(true);
    expect(sectionResult.issues.some((issue) => issue.path.includes('enemy.baseStats.combatSkill'))).toBe(true);

    const storyResult = validateStory({
      id: 'broken-story',
      startSectionId: 1,
      sections: {
        '1': invalidSection,
      },
    });

    expect(storyResult.valid).toBe(false);
    expect(storyResult.issues.some((issue) => issue.path.includes('choices[0].target'))).toBe(true);
  });

  it('reports a story with references to missing sections', () => {
    const invalidStory: Story = {
      id: 'broken-story',
      startSectionId: 1,
      sections: {
        '1': {
          id: 1,
          text: ['Start'],
          choices: [{ id: 'missing', text: 'Missing target', target: 2 }],
        },
      },
    };

    const result = validateStory(invalidStory);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes('does not exist'))).toBe(true);
  });

  it('accepts a minimally valid combat event', () => {
    const result = validateCombatEvent({
      type: 'combat',
      enemy: {
        name: 'Broken',
        baseStats: { combatSkill: 10, endurance: 4 },
      },
      victoryTarget: 9,
      defeatTarget: 10,
    });

    expect(result.valid).toBe(true);
  });
});