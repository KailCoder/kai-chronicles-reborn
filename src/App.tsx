import { useEffect, useMemo, useState } from 'react';
import storyData from './content/sample-story.json';
import { choose, getAvailableChoices, startStory } from './game/engine';
import { clearGameState, loadGameState, saveGameState } from './game/persistence';
import type { GameState, PlayerState, Story } from './game/types';

const story = storyData as Story;
const defaultPlayer: PlayerState = {
  health: 10,
  maxHealth: 10,
  combatSkill: 9,
  gold: 0,
  inventory: [],
  skills: ['kai-influence'],
  flags: {},
};

function createNewRun(): GameState {
  return startStory(story, defaultPlayer).state;
}

export default function App() {
  const [state, setState] = useState<GameState>(() => createNewRun());
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const currentSection = story.sections[state.currentSectionId];
  const availableChoices = useMemo(() => getAvailableChoices(currentSection, state), [currentSection, state]);

  useEffect(() => {
    const savedGame = loadGameState();

    if (savedGame) {
      setState(savedGame.state);
      setLoadedAt(savedGame.savedAt);
      return;
    }

    const initialState = createNewRun();
    setState(initialState);
    saveGameState(initialState);
  }, []);

  useEffect(() => {
    saveGameState(state);
  }, [state]);

  function handleChoice(choiceId: string) {
    setState((currentState) => choose(story, currentState, choiceId).state);
    setLoadedAt(null);
  }

  function handleNewGame() {
    const nextState = createNewRun();
    setState(nextState);
    setLoadedAt(null);
    saveGameState(nextState);
  }

  function handleClearSave() {
    clearGameState();
    setLoadedAt(null);
  }

  const inventory = state.player.inventory.length > 0 ? state.player.inventory : ['None'];
  const skills = state.player.skills.length > 0 ? state.player.skills : ['None'];
  const flagEntries = Object.entries(state.player.flags);

  return (
    <div className="app-shell">
      <div className="background-glow background-glow-left" />
      <div className="background-glow background-glow-right" />

      <main className="layout">
        <header className="hero">
          <div>
            <p className="eyebrow">Version 0.1.0</p>
            <h1>Kai Chronicles Reborn</h1>
            <p className="hero-copy">
              A modular gamebook engine with story data, player state, choices, and save slots kept deliberately small.
            </p>
          </div>

          <div className="hero-actions">
            <button type="button" className="button button-primary" onClick={handleNewGame}>
              New Game
            </button>
            <button type="button" className="button button-secondary" onClick={handleClearSave}>
              Clear Save
            </button>
          </div>
        </header>

        <section className="playfield">
          <article className="story-panel">
            <div className="story-meta">
              <span>{currentSection.title ?? 'Untitled section'}</span>
              <span>{state.currentSectionId}</span>
            </div>

            <h2>{currentSection.title ?? 'Story Section'}</h2>
            <p className="story-text">{currentSection.text}</p>

            <div className="choice-list">
              {availableChoices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="choice-card"
                  onClick={() => handleChoice(choice.id)}
                >
                  <span className="choice-text">{choice.text}</span>
                  <span className="choice-arrow">Continue</span>
                </button>
              ))}

              {availableChoices.length === 0 ? (
                <div className="empty-state">No available choices in this section.</div>
              ) : null}
            </div>
          </article>

          <aside className="sidebar">
            <section className="stat-card">
              <h3>Player</h3>
              <dl className="stats-grid">
                <div>
                  <dt>Health</dt>
                  <dd>{state.player.health} / {state.player.maxHealth}</dd>
                </div>
                <div>
                  <dt>Combat Skill</dt>
                  <dd>{state.player.combatSkill}</dd>
                </div>
                <div>
                  <dt>Gold</dt>
                  <dd>{state.player.gold}</dd>
                </div>
                <div>
                  <dt>Section</dt>
                  <dd>{state.visitedSectionIds.length}</dd>
                </div>
              </dl>
            </section>

            <section className="stat-card">
              <h3>Inventory</h3>
              <ul className="chip-list">
                {inventory.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            <section className="stat-card">
              <h3>Skills</h3>
              <ul className="chip-list">
                {skills.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            </section>

            <section className="stat-card">
              <h3>Flags</h3>
              {flagEntries.length > 0 ? (
                <ul className="flag-list">
                  {flagEntries.map(([flag, value]) => (
                    <li key={flag}>
                      <strong>{flag}</strong>
                      <span>{String(value)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">No active flags yet.</p>
              )}
            </section>

            <section className="stat-card">
              <h3>Save</h3>
              <p className="muted">
                {loadedAt ? `Loaded from ${new Date(loadedAt).toLocaleString()}` : 'Autosaved locally in the browser.'}
              </p>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}