Project Aon / HTML Importer
--------------------------------

Purpose
- Convert Project Aon HTML exports (Lobo Solitario) into a minimal JSON story format usable by the engine.

Quick usage
- Place the downloaded HTML file (for example `books/lobo1.html`).
- Run:

```bash
npm run import:projectaon
```

Or pass a custom section-folder path and output file:

```bash
npm run import:projectaon -- ./books/book1/extracted/en/xhtml/lw/01fftd ./src/content/lobo1.json
```
```

What the script does
- Finds numeric section anchors (e.g. `<a name="1">` or heading text starting with `1`).
- Collects the DOM nodes for each section until the next numeric anchor.
- Extracts paragraph text and inline choices (links to `#NN`).
- Produces `startSectionId`, and a `sections` array with `id`, `title`, `text[]`, and `choices[]`.
What the script does
- Walks all `sectNN.htm` files in the extracted directory.
- Uses the filename to identify the section id.
- Extracts readable paragraph text from the main text block.
- Extracts choices from paragraphs marked as `.choice` and resolves their target section ids.
- Produces `startSectionId` and a `sections` object keyed by section id.

Notes & limitations (MVP)
- The parser uses simple heuristics and aims to be forgiving; edge cases may need custom handling.
- Formatting (italics, bold) is flattened to plain text in this MVP. If you need markup preserved, we can extend the parser to keep allowed HTML tags or convert to Markdown.
Formatting (italics, bold, code) is converted to light Markdown where possible.
- The script writes a minimal wrapper object; you'll likely want to post-process effects/events or map book-specific conventions to engine effects.

Next improvements
- Preserve inline formatting to Markdown.
- Detect and map numbered lists or special blocks (rules, stats, combat boxes).
- Add a validator to ensure that all `choices[].target` exist in the produced JSON.
