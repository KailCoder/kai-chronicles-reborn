# kai-chronicles-reborn

Version: 0.1.0

Kai Chronicles Reborn is a small, modular gamebook engine and companion app inspired by Lone Wolf-style adventure books.

## What is in this first commit

1. A JSON-driven story format with sections, text paragraphs, effects, choices, and combat events.
2. A pure TypeScript engine for navigating story sections, updating player state, and resolving combat.
3. A React + Vite frontend shell that renders the current section and available choices.
4. Local save/load support through the browser.

## Quick start

```bash
npm install
npm run dev
```

## Tutorial

### 1. Start the app

Run `npm run dev` and open the local URL shown by Vite. The app loads the current story section and saves progress automatically in the browser.

### 2. Play through the sample story

You begin at the first section in [src/content/sample-story.json](src/content/sample-story.json). Click a choice to move to the next section. The sample story demonstrates three things:

1. Section entry effects, like giving the player a torch and gold.
2. Conditional choices, like the shrine option that appears only if the player has the torch.
3. State changes, like health loss in the forest and healing at the shrine.

### 3. Use the controls in the UI

The main screen has two areas:

1. The story panel on the left shows the current section text and the available choices.
2. The sidebar on the right shows player stats, inventory, skills, flags, and save information.

The buttons at the top do the following:

1. New Game resets the run to the start of the sample story.
2. Clear Save removes the browser save file.

### 4. Edit the story content

To change the gamebook, edit [src/content/sample-story.json](src/content/sample-story.json).

Each section has:

1. `text` as an array of paragraphs.
2. `effects` for automatic changes when the section loads.
3. `choices` for the paths the player can take.
4. `events` for structured encounters such as combat.

Each choice can include:

1. `target` for the next section.
2. `requirements` to hide the choice unless the player meets the requirements.
3. `effects` to apply before moving to the next section.

Combat events use the same data-first approach:

1. `enemy` defines the enemy stats.
2. `victoryTarget` defines where the story continues if the player wins.
3. `defeatTarget` defines where the story continues if the player loses.

### 5. Extend the engine

If you want to add more books later, keep the game logic in [src/game/engine.ts](src/game/engine.ts) and content in JSON. That separation lets you reuse the same UI and state system for different stories.

### 6. Test what exists now

Run these checks before making changes:

```bash
npm run typecheck
npm run build
```

For a visual smoke test, run the app with `npm run dev`, open the browser, and click through at least one branch. The current sample story should show the forest path changing health and the shrine branch restoring health and setting the `blessed` flag.

## Project structure

* [src/game/types.ts](src/game/types.ts) defines the story and player data model.
* [src/game/engine.ts](src/game/engine.ts) contains the pure navigation and state-update logic.
* [src/game/persistence.ts](src/game/persistence.ts) wraps localStorage save/load behavior.
* [src/content/sample-story.json](src/content/sample-story.json) is the sample story content.
* [src/App.tsx](src/App.tsx) renders the playable MVP.

## Update plan

The repo is intentionally small so it can grow in frequent commits without fighting a large framework layer. Next additions should stay modular: combat resolution, richer condition types, inventory screens, and multiple save slots.
