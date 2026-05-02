import fs from 'fs/promises';
import path from 'path';
import { load, type CheerioAPI, type Cheerio, type Element } from 'cheerio';

export interface ImportedChoice {
  id: string;
  text: string;
  target: number;
}

export interface ImportedSection {
  id: number;
  title?: string;
  text: string[];
  choices: ImportedChoice[];
  effects: [];
  events: [];
}

export interface ImportedStory {
  id: string;
  startSectionId: number;
  sections: Record<string, ImportedSection>;
}

const SECTION_FILE_PATTERN = /^sect(\d+)\.(?:htm|html)$/i;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeSectionId(fileName: string): number | null {
  const match = fileName.match(SECTION_FILE_PATTERN);
  return match ? Number.parseInt(match[1], 10) : null;
}

function renderInlineHtml($: CheerioAPI, node: Element): string {
  if (node.type === 'text') {
    return node.data ?? '';
  }

  if (node.type !== 'tag') {
    return '';
  }

  const element = $(node);
  const tagName = node.tagName.toLowerCase();
  const renderedChildren = element
    .contents()
    .toArray()
    .map((child) => renderInlineHtml($, child as Element))
    .join('');

  switch (tagName) {
    case 'br':
      return '\n';
    case 'strong':
    case 'b':
      return `**${renderedChildren}**`;
    case 'em':
    case 'i':
      return `*${renderedChildren}*`;
    case 'code':
      return `\`${renderedChildren}\``;
    case 'a':
      return renderedChildren;
    case 'sup':
    case 'sub':
      return renderedChildren;
    default:
      return renderedChildren;
  }
}

function renderParagraph($: CheerioAPI, paragraph: Element): string {
  return normalizeWhitespace(renderInlineHtml($, paragraph));
}

function extractTarget(href: string | undefined): number | null {
  if (!href) {
    return null;
  }

  const numericAnchor = href.match(/#(\d+)\b/);
  if (numericAnchor) {
    return Number.parseInt(numericAnchor[1], 10);
  }

  const sectionFile = href.match(/sect(\d+)\.(?:htm|html?)$/i);
  if (sectionFile) {
    return Number.parseInt(sectionFile[1], 10);
  }

  return null;
}

async function walkFiles(rootPath: string): Promise<string[]> {
  const stat = await fs.stat(rootPath);
  if (stat.isFile()) {
    return [rootPath];
  }

  const result: string[] = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const nextPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(nextPath)));
      continue;
    }

    if (SECTION_FILE_PATTERN.test(entry.name)) {
      result.push(nextPath);
    }
  }

  return result;
}

function extractSectionData(filePath: string, html: string): ImportedSection | null {
  const fileName = path.basename(filePath);
  const fileSectionId = decodeSectionId(fileName);
  if (fileSectionId === null) {
    return null;
  }

  const $ = load(html);
  const mainText = $('div.maintext').first();
  const titleHeading = mainText.find('h3, h2, h1').first();
  const text: string[] = [];
  const choices: ImportedChoice[] = [];

  if (mainText.length === 0) {
    return null;
  }

  let choiceIndex = 0;

  mainText.find('> p').each((_, paragraphElement) => {
    const paragraph = paragraphElement as Element;
    const className = ($(paragraph).attr('class') || '').toLowerCase();

    if (className.includes('choice')) {
      const target = extractTarget($(paragraph).find('a[href]').first().attr('href'));
      if (target !== null) {
        choiceIndex += 1;
        choices.push({
          id: `choice-${fileSectionId}-${choiceIndex}`,
          text: renderParagraph($, paragraph),
          target,
        });
      }
      return;
    }

    const rendered = renderParagraph($, paragraph);
    if (rendered) {
      text.push(rendered);
    }
  });

  const section: ImportedSection = {
    id: fileSectionId,
    title: titleHeading.length ? normalizeWhitespace(titleHeading.text()).replace(/^\d+\s*/, '') || undefined : undefined,
    text,
    choices,
    effects: [],
    events: [],
  };

  return section;
}

export async function importProjectAonBook(sourcePath: string): Promise<ImportedStory> {
  const inputFiles = await walkFiles(sourcePath);
  const sections: ImportedSection[] = [];

  for (const filePath of inputFiles.sort((left, right) => left.localeCompare(right, 'en'))) {
    const html = await fs.readFile(filePath, 'utf8');
    const section = extractSectionData(filePath, html);
    if (section) {
      sections.push(section);
    }
  }

  if (sections.length === 0) {
    throw new Error(`No section files were found in ${sourcePath}`);
  }

  sections.sort((left, right) => left.id - right.id);

  const missingTargets = new Set<number>();
  const sectionIds = new Set(sections.map((section) => section.id));

  for (const section of sections) {
    for (const choice of section.choices) {
      if (!sectionIds.has(choice.target)) {
        missingTargets.add(choice.target);
      }
    }
  }

  if (missingTargets.size > 0) {
    console.warn(`Warning: ${missingTargets.size} choice target(s) do not match a section file in ${sourcePath}.`);
  }

  const story: ImportedStory = {
    id: path.basename(sourcePath),
    startSectionId: sections[0].id,
    sections: Object.fromEntries(sections.map((section) => [String(section.id), section])),
  };

  return story;
}
