import { useEffect, useMemo, useState } from 'react';
import introFlowData from './content/lobo1-intro.json';
import storyData from './content/lobo1.json';
import { choose, getAvailableChoices } from './game/engine';
import { resolveCombatEncounter, stepCombatEncounter } from './game/combat';
import { clearGameState, loadGameState, saveGameState } from './game/persistence';
import {
  advanceIntro,
  createIntroSession,
  getCurrentIntroStep,
  syncPlayingSession,
  toggleIntroSkill,
  type IntroFlow,
  type SessionState,
} from './game/flow';
import type { PlayerState, Story } from './game/types';

const story = storyData as Story;
const introFlow = introFlowData as IntroFlow;
const bookId = introFlow.bookId;
const storyTitle = 'Flight from the Dark';
const defaultPlayer: PlayerState = {
  combatSkill: 9,
  endurance: 10,
  maxEndurance: 10,
  gold: 0,
  inventory: [],
  skills: [],
  flags: {},
};

function createNewRun(): SessionState {
  return createIntroSession(bookId, defaultPlayer);
}

function getStorySection(state: SessionState) {
  if (state.phase !== 'playing' || !state.gameState) {
    return null;
  }

  return story.sections[String(state.gameState.currentSectionId)];
}

export default function App() {
  const [state, setState] = useState<SessionState>(() => createNewRun());
  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  const currentIntroStep = state.phase === 'intro' ? getCurrentIntroStep(state, introFlow) : null;
  const currentSection = getStorySection(state);
  const availableChoices = useMemo(() => {
    if (!currentSection || state.phase !== 'playing' || !state.gameState) {
      return [];
    }

    return getAvailableChoices(currentSection, state.gameState);
  }, [currentSection, state]);

  const activeCombat = state.phase === 'playing' ? state.gameState?.activeCombat ?? null : null;

  useEffect(() => {
    const savedGame = loadGameState(bookId);

    if (savedGame) {
      setState(savedGame.state);
      setLoadedAt(savedGame.savedAt);
      return;
    }

    const initialState = createNewRun();
    setState(initialState);
    saveGameState(initialState, bookId);
  }, []);

  useEffect(() => {
    saveGameState(state, bookId);
  }, [state]);

  function handleIntroSkillToggle(skillId: string) {
    setState((currentState) => toggleIntroSkill(currentState, skillId, introFlow));
    setLoadedAt(null);
  }

  function handleIntroContinue() {
    setState((currentState) => advanceIntro(currentState, introFlow, story));
    setLoadedAt(null);
  }

  function handleChoice(choiceId: string) {
    setState((currentState) => {
      if (currentState.phase !== 'playing' || !currentState.gameState) {
        return currentState;
      }

      const nextGameState = choose(story, currentState.gameState, choiceId).state;
      return syncPlayingSession(currentState, nextGameState);
    });
    setLoadedAt(null);
  }

  function handleResolveCombat() {
    setState((currentState) => {
      if (currentState.phase !== 'playing' || !currentState.gameState) {
        return currentState;
      }

      const nextGameState = resolveCombatEncounter(story, currentState.gameState);
      return syncPlayingSession(currentState, nextGameState);
    });
    setLoadedAt(null);
  }

  function handleStepCombat() {
    setState((currentState) => {
      if (currentState.phase !== 'playing' || !currentState.gameState) {
        return currentState;
      }

      const nextGameState = stepCombatEncounter(story, currentState.gameState);
      return syncPlayingSession(currentState, nextGameState);
    });
    setLoadedAt(null);
  }

  function handleNewGame() {
    const nextState = createNewRun();
    setState(nextState);
    setLoadedAt(null);
    saveGameState(nextState, bookId);
  }

  function handleClearSave() {
    clearGameState();
    const nextState = createNewRun();
    setState(nextState);
    setLoadedAt(null);
    saveGameState(nextState, bookId);
  }

  const inventory = state.player.inventory.length > 0 ? state.player.inventory : ['None'];
  const skills = state.player.skills.length > 0 ? state.player.skills : ['None'];
  const flagEntries = Object.entries(state.player.flags);

  return (
    <div className={`app-shell phase-${state.phase}`}>
      <div className="background-glow background-glow-left" />
      <div className="background-glow background-glow-right" />

      <main className="layout">
        <header className="hero">
          <div>
            <p className="eyebrow">Version 0.1.0</p>
            <h1>{storyTitle}</h1>
            <p className="hero-copy">
              {state.phase === 'intro'
                ? 'Book 1 now opens with a reusable intro flow for story setup and Kai Discipline selection.'
                : 'The intro is complete. The gamebook engine is now in section-based play mode.'}
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
          <article key={state.phase} className={`story-panel phase-panel phase-panel-${state.phase}`}>
            <div className="story-meta">
              {state.phase === 'intro' && currentIntroStep ? (
                <>
                  <span>Introduction</span>
                  <span>{currentIntroStep.id}</span>
                </>
              ) : (
                <>
                  <span>{currentSection?.title ?? 'Untitled section'}</span>
                  <span>{state.currentSectionId ?? '—'}</span>
                </>
              )}
            </div>

            {state.phase === 'intro' && currentIntroStep ? (
              <>
                <h2>{currentIntroStep.title}</h2>
                <div className="story-text">
                  {currentIntroStep.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {currentIntroStep.kind === 'skill_selection' ? (
                  <section className="intro-selection">
                    <div className="selection-meta">
                      <span>{state.selectedSkills.length} / {currentIntroStep.requiredSelections} selected</span>
                      <span>Choose carefully</span>
                    </div>
                    <div className="skill-grid">
                      {currentIntroStep.options.map((option) => {
                        const selected = state.selectedSkills.includes(option.id);

                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={`skill-card${selected ? ' is-selected' : ''}`}
                            onClick={() => handleIntroSkillToggle(option.id)}
                          >
                            <span className="skill-card-title">{option.label}</span>
                            <span className="skill-card-copy">{option.description}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="button button-primary intro-button"
                      onClick={handleIntroContinue}
                      disabled={state.selectedSkills.length < currentIntroStep.requiredSelections}
                    >
                      {currentIntroStep.continueLabel ?? 'Continue'}
                    </button>
                  </section>
                ) : (
                  <button type="button" className="button button-primary intro-button" onClick={handleIntroContinue}>
                    {currentIntroStep.continueLabel ?? 'Continue'}
                  </button>
                )}
              </>
            ) : null}

            {state.phase === 'playing' && currentSection ? (
              <>
                <h2>{currentSection.title ?? 'Story Section'}</h2>
                <div className="story-text">
                  {currentSection.text.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>

                {activeCombat ? (
                  <section className="combat-card">
                    <h3>Combat</h3>
                    <p>
                      {activeCombat.event.enemy.name} blocks your path. Resolve the fight to continue.
                    </p>
                    <dl className="stats-grid">
                      <div>
                        <dt>Enemy CS</dt>
                        <dd>{activeCombat.event.enemy.baseStats.combatSkill}</dd>
                      </div>
                      <div>
                        <dt>Enemy EN</dt>
                        <dd>{activeCombat.enemyEndurance}</dd>
                      </div>
                      <div>
                        <dt>Victory</dt>
                        <dd>{String(activeCombat.event.victoryTarget)}</dd>
                      </div>
                      <div>
                        <dt>Defeat</dt>
                        <dd>{String(activeCombat.event.defeatTarget)}</dd>
                      </div>
                    </dl>
                    <button type="button" className="button button-primary combat-button" onClick={handleResolveCombat}>
                      Resolve Combat
                    </button>
                    <button type="button" className="button button-secondary combat-button" onClick={handleStepCombat}>
                      Step Combat
                    </button>
                    {activeCombat.history.length > 0 ? (
                      <div className="combat-history">
                        <h4>History</h4>
                        <ol>
                          {activeCombat.history.map((r) => (
                            <li key={r.round}>
                              Round {r.round}: P-roll {r.playerRoll} vs E-roll {r.enemyRoll} — P dmg {r.playerDamage} / E dmg {r.enemyDamage} (P: {r.playerEnduranceAfter}, E: {r.enemyEnduranceAfter})
                            </li>
                          ))}
                        </ol>
                      </div>
                    ) : null}
                  </section>
                ) : null}

                {!activeCombat ? (
                  <div className="choice-list">
                    {availableChoices.map((choice) => {
                      const choiceId = choice.id ?? choice.text;

                      return (
                        <button
                          key={choiceId}
                          type="button"
                          className="choice-card"
                          onClick={() => handleChoice(choiceId)}
                        >
                          <span className="choice-text">{choice.text}</span>
                          <span className="choice-arrow">Continue</span>
                        </button>
                      );
                    })}

                    {availableChoices.length === 0 ? (
                      <div className="empty-state">No available choices in this section.</div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </article>

          <aside className="sidebar">
            <section className="stat-card">
              <h3>Player</h3>
              <dl className="stats-grid">
                <div>
                  <dt>Phase</dt>
                  <dd>{state.phase}</dd>
                </div>
                <div>
                  <dt>Endurance</dt>
                  <dd>
                    {(activeCombat ? (state.player.currentEndurance ?? state.player.endurance) : state.player.endurance)} / {state.player.maxEndurance}
                  </dd>
                </div>
                <div>
                  <dt>Combat Skill</dt>
                  <dd>{state.player.combatSkill}</dd>
                </div>
                <div>
                  <dt>Gold</dt>
                  <dd>{state.player.gold}</dd>
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
