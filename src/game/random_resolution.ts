import { createBlindRandomState, revealAllBlindRandomSlots, selectBlindRandomSlot, type BlindRandomState, type RandomMode, type RandomSource } from './random';
import type { ActiveRandomCheckState, RandomCheckSection, SectionId } from './types';

export interface RandomResolutionConfig {
  randomMode?: RandomMode;
  randomSource?: RandomSource;
}

export function startRandomCheck(section: RandomCheckSection, config: RandomResolutionConfig = {}): ActiveRandomCheckState {
  const randomSource = config.randomSource ?? Math.random;

  return {
    sectionId: section.id,
    prompt: section.prompt,
    outcomes: { ...section.outcomes },
    board: createBlindRandomState(randomSource),
    selectedIndex: null,
    selectedValue: null,
    isRevealed: false,
  };
}

export function selectRandomCheckSlot(state: ActiveRandomCheckState, index: number): ActiveRandomCheckState {
  const selection = selectBlindRandomSlot(state.board, index);

  return {
    ...state,
    board: selection.state,
    selectedIndex: index,
    selectedValue: selection.value,
    isRevealed: false,
  };
}

export function revealRandomCheck(state: ActiveRandomCheckState): ActiveRandomCheckState {
  return {
    ...state,
    board: revealAllBlindRandomSlots(state.board),
    isRevealed: true,
  };
}

export function resolveRandomCheck(outcomes: Record<string, SectionId>, value: number): SectionId {
  const target = outcomes[String(value)];

  if (target === undefined || target === null || target === '') {
    throw new Error(`No random-check outcome defined for value ${value}`);
  }

  return target;
}
