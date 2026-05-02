import type { CombatEvent, EnemyDefinition, GameState, RandomCheckSection, Section, Story, PlayerState } from './types';

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validatePlayerState(player: PlayerState): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Number.isFinite(player.combatSkill) || player.combatSkill < 0) {
    issues.push({ path: 'player.combatSkill', message: 'combatSkill must be a non-negative finite number.' });
  }

  if (!Number.isFinite(player.endurance) || player.endurance < 0) {
    issues.push({ path: 'player.endurance', message: 'endurance must be a non-negative finite number.' });
  }

  if (!Number.isFinite(player.maxEndurance) || player.maxEndurance < 0) {
    issues.push({ path: 'player.maxEndurance', message: 'maxEndurance must be a non-negative finite number.' });
  }

  if (player.endurance > player.maxEndurance) {
    issues.push({ path: 'player.endurance', message: 'endurance cannot exceed maxEndurance.' });
  }

  return finishValidation(issues);
}

export function validateEnemyDefinition(enemy: EnemyDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!enemy.name.trim()) {
    issues.push({ path: 'enemy.name', message: 'Enemy name is required.' });
  }

  if (!Number.isFinite(enemy.baseStats.combatSkill) || enemy.baseStats.combatSkill < 0) {
    issues.push({ path: 'enemy.baseStats.combatSkill', message: 'Enemy combatSkill must be a non-negative finite number.' });
  }

  if (!Number.isFinite(enemy.baseStats.endurance) || enemy.baseStats.endurance <= 0) {
    issues.push({ path: 'enemy.baseStats.endurance', message: 'Enemy endurance must be a positive finite number.' });
  }

  return finishValidation(issues);
}

export function validateCombatEvent(event: CombatEvent): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (event.type !== 'combat') {
    issues.push({ path: 'event.type', message: 'Combat event type must be "combat".' });
  }

  issues.push(...validateEnemyDefinition(event.enemy).issues.map((issue) => ({
    path: `event.${issue.path}`,
    message: issue.message,
  })));

  if (event.victoryTarget === undefined || event.victoryTarget === null) {
    issues.push({ path: 'event.victoryTarget', message: 'victoryTarget is required.' });
  }

  if (event.defeatTarget === undefined || event.defeatTarget === null) {
    issues.push({ path: 'event.defeatTarget', message: 'defeatTarget is required.' });
  }

  return finishValidation(issues);
}

export function validateSection(section: Section): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (section.id === undefined || section.id === null || section.id === '') {
    issues.push({ path: 'section.id', message: 'Section id is required.' });
  }

  if (!Array.isArray(section.text) || section.text.length === 0) {
    issues.push({ path: 'section.text', message: 'Section text must be a non-empty array.' });
  }

  if (section.type === 'random_check') {
    const randomCheck = section as RandomCheckSection;

    if (!randomCheck.prompt.trim()) {
      issues.push({ path: 'section.prompt', message: 'Random-check prompt is required.' });
    }

    const outcomeKeys = Object.keys(randomCheck.outcomes ?? {});
    if (outcomeKeys.length === 0) {
      issues.push({ path: 'section.outcomes', message: 'Random-check outcomes must define at least one target.' });
    }

    for (const [key, target] of Object.entries(randomCheck.outcomes ?? {})) {
      if (!/^\d$/.test(key)) {
        issues.push({ path: `section.outcomes.${key}`, message: 'Random-check outcome keys must be digits 0-9.' });
      }

      if (target === undefined || target === null || target === '') {
        issues.push({ path: `section.outcomes.${key}`, message: 'Random-check outcome target is required.' });
      }
    }
  } else {
    if (!Array.isArray(section.choices)) {
      issues.push({ path: 'section.choices', message: 'Section choices must be an array.' });
    }

    for (const [index, choice] of (section.choices ?? []).entries()) {
      if (!choice.text.trim()) {
        issues.push({ path: `section.choices[${index}].text`, message: 'Choice text is required.' });
      }

      if (choice.target === undefined || choice.target === null || choice.target === '') {
        issues.push({ path: `section.choices[${index}].target`, message: 'Choice target is required.' });
      }
    }

    for (const [index, event] of (section.events ?? []).entries()) {
      if (event.type === 'combat') {
        const result = validateCombatEvent(event);
        issues.push(...result.issues.map((issue) => ({ path: `section.events[${index}].${issue.path}`, message: issue.message })));
      }
    }
  }

  return finishValidation(issues);
}

export function validateStory(story: Story): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (story.startSectionId === undefined || story.startSectionId === null || story.startSectionId === '') {
    issues.push({ path: 'story.startSectionId', message: 'startSectionId is required.' });
  }

  if (!story.sections || typeof story.sections !== 'object') {
    issues.push({ path: 'story.sections', message: 'sections must be an object.' });
    return finishValidation(issues);
  }

  const sectionIds = new Set(Object.keys(story.sections));

  for (const [sectionKey, section] of Object.entries(story.sections)) {
    const sectionValidation = validateSection(section);
    issues.push(...sectionValidation.issues.map((issue) => ({ path: `sections.${sectionKey}.${issue.path}`, message: issue.message })));

    if (section.type === 'random_check') {
      for (const [outcomeKey, target] of Object.entries(section.outcomes ?? {})) {
        const targetKey = String(target);
        if (!sectionIds.has(targetKey)) {
          issues.push({
            path: `sections.${sectionKey}.outcomes.${outcomeKey}`,
            message: `Random-check outcome target ${targetKey} does not exist in story.sections.`,
          });
        }
      }
    } else {
      for (const [choiceIndex, choice] of (section.choices ?? []).entries()) {
        const targetKey = String(choice.target);
        if (!sectionIds.has(targetKey)) {
          issues.push({
            path: `sections.${sectionKey}.choices[${choiceIndex}].target`,
            message: `Choice target ${targetKey} does not exist in story.sections.`,
          });
        }
      }

      for (const [eventIndex, event] of (section.events ?? []).entries()) {
        if (event.type === 'combat') {
          const targetKeys = [String(event.victoryTarget), String(event.defeatTarget)];
          for (const [targetIndex, targetKey] of targetKeys.entries()) {
            if (!sectionIds.has(targetKey)) {
              const targetName = targetIndex === 0 ? 'victoryTarget' : 'defeatTarget';
              issues.push({
                path: `sections.${sectionKey}.events[${eventIndex}].${targetName}`,
                message: `Combat ${targetName} ${targetKey} does not exist in story.sections.`,
              });
            }
          }
        }
      }
    }
  }

  return finishValidation(issues);
}

function finishValidation(issues: ValidationIssue[]): ValidationResult {
  return {
    valid: issues.length === 0,
    issues,
  };
}