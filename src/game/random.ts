export type RandomMode = 'fast' | 'classic';

export type RandomSource = () => number;

export interface BlindRandomSlot {
  index: number;
  value: number;
  revealed: boolean;
}

export interface BlindRandomState {
  slots: BlindRandomSlot[];
  selectedIndex: number | null;
  isRevealed: boolean;
}

export interface BlindRandomSelection {
  value: number;
  state: BlindRandomState;
}

export interface RandomNumberOptions {
  state?: BlindRandomState;
  randomSource?: RandomSource;
}

export function createBlindRandomState(randomSource: RandomSource = Math.random): BlindRandomState {
  const values = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], randomSource);

  return {
    slots: values.map((value, index) => ({
      index,
      value,
      revealed: false,
    })),
    selectedIndex: null,
    isRevealed: false,
  };
}

export function selectBlindRandomSlot(state: BlindRandomState, index: number): BlindRandomSelection {
  if (index < 0 || index >= state.slots.length) {
    throw new Error(`Invalid blind random slot index: ${index}`);
  }

  const slot = state.slots[index];

  if (slot.revealed) {
    throw new Error(`Blind random slot ${index} has already been revealed.`);
  }

  return {
    value: slot.value,
    state: {
      slots: state.slots.map((candidate, candidateIndex) => ({
        ...candidate,
        revealed: candidateIndex === index ? true : candidate.revealed,
      })),
      selectedIndex: index,
      isRevealed: false,
    },
  };
}

export function revealAllBlindRandomSlots(state: BlindRandomState): BlindRandomState {
  return {
    ...state,
    slots: state.slots.map((slot) => ({
      ...slot,
      revealed: true,
    })),
    isRevealed: true,
  };
}

export function drawRandomNumber(mode: RandomMode, options: RandomNumberOptions = {}): BlindRandomSelection {
  const randomSource = options.randomSource ?? Math.random;

  if (mode === 'fast') {
    const value = Math.floor(randomSource() * 10);
    const state = options.state ?? createBlindRandomState(randomSource);
    return {
      value,
      state,
    };
  }

  let workingState = options.state ?? createBlindRandomState(randomSource);
  let hiddenSlots = workingState.slots.filter((slot) => !slot.revealed);

  if (hiddenSlots.length === 0) {
    workingState = createBlindRandomState(randomSource);
    hiddenSlots = workingState.slots.filter((slot) => !slot.revealed);
  }

  const selectionIndex = Math.floor(randomSource() * hiddenSlots.length);
  const selectedSlot = hiddenSlots[Math.min(selectionIndex, hiddenSlots.length - 1)];

  return selectBlindRandomSlot(workingState, selectedSlot.index);
}

export function getRandomNumber(mode: RandomMode, options: RandomNumberOptions = {}): number {
  return drawRandomNumber(mode, options).value;
}

function shuffle(values: number[], randomSource: RandomSource): number[] {
  const copy = [...values];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomSource() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}