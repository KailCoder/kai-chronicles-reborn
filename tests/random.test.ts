import {
  createBlindRandomState,
  drawRandomNumber,
  getRandomNumber,
  revealAllBlindRandomSlots,
  selectBlindRandomSlot,
} from '../src/game/random';

function createSequenceRandom(values: number[]): () => number {
  let index = 0;

  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
}

describe('blind random system', () => {
  it('creates a shuffled deck of hidden digits 0-9', () => {
    const state = createBlindRandomState(createSequenceRandom([0.9, 0.8, 0.7, 0.6, 0.5]));

    expect(state.slots).toHaveLength(10);
    expect(state.slots.every((slot) => slot.revealed === false)).toBe(true);
    expect(new Set(state.slots.map((slot) => slot.value)).size).toBe(10);
  });

  it('reveals the selected slot first and then the full board', () => {
    const state = createBlindRandomState(createSequenceRandom([0.1, 0.2, 0.3, 0.4]));
    const selection = selectBlindRandomSlot(state, 3);

    expect(selection.value).toBe(state.slots[3].value);
    expect(selection.state.selectedIndex).toBe(3);
    expect(selection.state.slots[3].revealed).toBe(true);
    expect(selection.state.slots.filter((slot) => slot.revealed)).toHaveLength(1);

    const revealed = revealAllBlindRandomSlots(selection.state);
    expect(revealed.isRevealed).toBe(true);
    expect(revealed.slots.every((slot) => slot.revealed)).toBe(true);
  });

  it('draws deterministic classic and fast digits', () => {
    const fast = getRandomNumber('fast', { randomSource: createSequenceRandom([0.91]) });
    expect(fast).toBe(9);

    const classicState = createBlindRandomState(createSequenceRandom([0.1, 0.2, 0.3, 0.4]));
    const classic = drawRandomNumber('classic', {
      state: classicState,
      randomSource: createSequenceRandom([0.5]),
    });

    expect(classic.value).toBeGreaterThanOrEqual(0);
    expect(classic.value).toBeLessThanOrEqual(9);
    expect(classic.state.selectedIndex).not.toBeNull();
  });
});