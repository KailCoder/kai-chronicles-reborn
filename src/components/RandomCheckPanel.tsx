import { useEffect, useState } from 'react';
import { createBlindRandomState, revealAllBlindRandomSlots, selectBlindRandomSlot, type BlindRandomState } from '../game/random';

type RevealPhase = 'idle' | 'selected' | 'revealed';

const REVEAL_DELAY_MS = 420;

interface RandomCheckPanelProps {
  prompt: string;
  onResolve: (value: number) => void;
}

export default function RandomCheckPanel({ prompt, onResolve }: RandomCheckPanelProps) {
  const [board, setBoard] = useState<BlindRandomState>(() => createBlindRandomState());
  const [phase, setPhase] = useState<RevealPhase>('idle');
  const [selectedValue, setSelectedValue] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== 'selected') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setBoard((currentBoard) => revealAllBlindRandomSlots(currentBoard));
      setPhase('revealed');

      if (selectedValue !== null) {
        window.setTimeout(() => {
          onResolve(selectedValue);
        }, REVEAL_DELAY_MS);
      }
    }, REVEAL_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [onResolve, phase, selectedValue]);

  function handleReset() {
    setBoard(createBlindRandomState());
    setSelectedValue(null);
    setPhase('idle');
  }

  function handleSelect(index: number) {
    if (phase !== 'idle') {
      return;
    }

    const selection = selectBlindRandomSlot(board, index);
    setBoard(selection.state);
    setSelectedValue(selection.value);
    setPhase('selected');
  }

  return (
    <section className="combat-card random-check-card">
      <h3>Random Check</h3>
      <p>{prompt}</p>

      <div className="blind-grid" role="grid" aria-label="Random check selection board">
        {board.slots.map((slot) => {
          const isSelected = board.selectedIndex === slot.index;

          return (
            <button
              key={slot.index}
              type="button"
              className={`blind-slot${slot.revealed ? ' is-revealed' : ''}${isSelected ? ' is-selected' : ''}`}
              onClick={() => handleSelect(slot.index)}
              disabled={phase !== 'idle'}
              aria-label={`Hidden slot ${slot.index + 1}`}
            >
              <span className="blind-slot-index">{slot.index + 1}</span>
              <span className="blind-slot-value">{slot.revealed ? slot.value : '•'}</span>
            </button>
          );
        })}
      </div>

      <div className="blind-result">
        <span>Result</span>
        <strong>{selectedValue === null ? 'Select a slot' : selectedValue}</strong>
      </div>

      <div className="random-actions">
        <button type="button" className="button button-secondary" onClick={handleReset}>
          New Deck
        </button>
      </div>
    </section>
  );
}