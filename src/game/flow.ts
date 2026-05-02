import { startStory } from './engine';
import type { GameState, PlayerState, SectionId, SkillId, Story } from './types';

export interface IntroTextStep {
  id: string;
  kind: 'text';
  title: string;
  paragraphs: string[];
  continueLabel?: string;
}

export interface IntroSkillOption {
  id: SkillId;
  label: string;
  description: string;
}

export interface IntroSkillSelectionStep {
  id: string;
  kind: 'skill_selection';
  title: string;
  paragraphs: string[];
  requiredSelections: number;
  options: IntroSkillOption[];
  continueLabel?: string;
}

export interface IntroConfirmStep {
  id: string;
  kind: 'confirm';
  title: string;
  paragraphs: string[];
  continueLabel?: string;
}

export type IntroStep = IntroTextStep | IntroSkillSelectionStep | IntroConfirmStep;

export interface IntroFlow {
  bookId: string;
  steps: IntroStep[];
}

export interface SessionState {
  bookId: string;
  phase: 'intro' | 'playing';
  currentSectionId: SectionId | null;
  player: PlayerState;
  introStepIndex: number;
  selectedSkills: SkillId[];
  gameState: GameState | null;
}

export function createIntroSession(bookId: string, player: PlayerState): SessionState {
  return {
    bookId,
    phase: 'intro',
    currentSectionId: null,
    player: clonePlayer(player),
    introStepIndex: 0,
    selectedSkills: [],
    gameState: null,
  };
}

export function getCurrentIntroStep(session: SessionState, introFlow: IntroFlow): IntroStep {
  return introFlow.steps[Math.min(session.introStepIndex, introFlow.steps.length - 1)];
}

export function toggleIntroSkill(session: SessionState, skillId: SkillId, introFlow: IntroFlow): SessionState {
  if (session.phase !== 'intro') {
    return session;
  }

  const currentStep = getCurrentIntroStep(session, introFlow);
  if (currentStep.kind !== 'skill_selection') {
    return session;
  }

  const alreadySelected = session.selectedSkills.includes(skillId);

  if (alreadySelected) {
    const nextSkills = session.selectedSkills.filter((selectedSkill) => selectedSkill !== skillId);

    return {
      ...session,
      player: {
        ...session.player,
        skills: nextSkills,
      },
      selectedSkills: nextSkills,
    };
  }

  if (session.selectedSkills.length >= currentStep.requiredSelections) {
    return session;
  }

  return {
    ...session,
    player: {
      ...session.player,
      skills: [...session.selectedSkills, skillId],
    },
    selectedSkills: [...session.selectedSkills, skillId],
  };
}

export function advanceIntro(session: SessionState, introFlow: IntroFlow, story: Story): SessionState {
  if (session.phase !== 'intro') {
    return session;
  }

  const currentStep = getCurrentIntroStep(session, introFlow);
  if (currentStep.kind === 'skill_selection' && session.selectedSkills.length < currentStep.requiredSelections) {
    return session;
  }

  const nextStepIndex = session.introStepIndex + 1;
  if (nextStepIndex < introFlow.steps.length) {
    return {
      ...session,
      introStepIndex: nextStepIndex,
    };
  }

  const startingPlayer = applySelectedSkills(session.player, session.selectedSkills);
  const startingGame = startStory(story, startingPlayer).state;

  return {
    bookId: session.bookId,
    phase: 'playing',
    currentSectionId: startingGame.currentSectionId,
    player: startingGame.player,
    introStepIndex: session.introStepIndex,
    selectedSkills: session.selectedSkills,
    gameState: startingGame,
  };
}

export function syncPlayingSession(session: SessionState, gameState: GameState): SessionState {
  if (session.phase !== 'playing') {
    return session;
  }

  return {
    ...session,
    currentSectionId: gameState.currentSectionId,
    player: gameState.player,
    gameState,
  };
}

export function createNewGameSession(bookId: string, player: PlayerState): SessionState {
  return createIntroSession(bookId, player);
}

export function createPlayingSession(bookId: string, gameState: GameState, selectedSkills: SkillId[] = []): SessionState {
  return {
    bookId,
    phase: 'playing',
    currentSectionId: gameState.currentSectionId,
    player: gameState.player,
    introStepIndex: 0,
    selectedSkills: [...selectedSkills],
    gameState,
  };
}

function applySelectedSkills(player: PlayerState, selectedSkills: SkillId[]): PlayerState {
  return {
    ...player,
    skills: Array.from(new Set([...player.skills, ...selectedSkills])),
  };
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    inventory: [...player.inventory],
    skills: [...player.skills],
    flags: { ...player.flags },
  };
}
