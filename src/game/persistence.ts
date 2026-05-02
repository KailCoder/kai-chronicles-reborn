import type { GameState } from './types';

export interface SaveFile {
  version: number;
  savedAt: string;
  state: GameState;
}

const SAVE_KEY = 'kai-chronicles-reborn.save.v1';
const SAVE_VERSION = 1;

export function saveGameState(state: GameState): void {
  const saveFile: SaveFile = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
}

export function loadGameState(): SaveFile | null {
  const rawSave = localStorage.getItem(SAVE_KEY);

  if (!rawSave) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSave) as Partial<SaveFile>;

    if (parsed.version !== SAVE_VERSION || !parsed.state) {
      return null;
    }

    return parsed as SaveFile;
  } catch {
    return null;
  }
}

export function clearGameState(): void {
  localStorage.removeItem(SAVE_KEY);
}