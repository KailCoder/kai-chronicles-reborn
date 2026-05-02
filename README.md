# kai-chronicles-reborn

Version: 0.1.0

Kai Chronicles Reborn is a small, modular gamebook engine and companion app inspired by Lone Wolf-style adventure books.

## What is in this first commit

1. A JSON-driven story format with sections, choices, effects, and conditions.
2. A pure TypeScript engine for navigating story sections and updating player state.
3. A React + Vite frontend shell that renders the current section and available choices.
4. Local save/load support through the browser.

## Quick start

```bash
npm install
npm run dev
```

## Project structure

* [src/game/types.ts](src/game/types.ts) defines the story and player data model.
* [src/game/engine.ts](src/game/engine.ts) contains the pure navigation and state-update logic.
* [src/game/persistence.ts](src/game/persistence.ts) wraps localStorage save/load behavior.
* [src/content/sample-story.json](src/content/sample-story.json) is the sample story content.
* [src/App.tsx](src/App.tsx) renders the playable MVP.

## Update plan

The repo is intentionally small so it can grow in frequent commits without fighting a large framework layer. Next additions should stay modular: combat resolution, richer condition types, inventory screens, and multiple save slots.
