import type { SessionState } from './flow';

export interface SaveFile {
  version: number;
  savedAt: string;
  storyId?: string;
  state: SessionState;
}

const SAVE_KEY = 'kai-chronicles-reborn.save.v1';
const SAVE_VERSION = 3;

export function saveGameState(state: SessionState, storyId?: string): void {
  const saveFile: SaveFile = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    storyId,
    state,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(saveFile));
}

export function loadGameState(expectedStoryId?: string): SaveFile | null {
  const rawSave = localStorage.getItem(SAVE_KEY);

  if (!rawSave) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSave) as Partial<SaveFile>;

    if (parsed.version !== SAVE_VERSION || !parsed.state) {
      return null;
    }

    if (expectedStoryId && parsed.storyId !== expectedStoryId) {
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