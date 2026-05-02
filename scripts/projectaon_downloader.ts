import fs from 'fs/promises';
import { createWriteStream, createReadStream } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { load } from 'cheerio';
import * as unzipper from 'unzipper';

export type DownloadKind = 'zip' | 'html';

export type DownloadResolution = {
  kind: DownloadKind;
  url: string;
};

export type ProjectAonBookConfig = {
  bookId: string;
  sourceUrl: string;
};

const DEFAULT_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function hasZipExtension(url: string) {
  return /\.zip(?:$|\?)/i.test(url);
}

function hasHtmlExtension(url: string) {
  return /\.(?:html?|xhtml)(?:$|\?)/i.test(url);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(href: string, baseUrl: string) {
  return new URL(href, baseUrl).toString();
}

async function fetchTextWithRetry(url: string, retries = DEFAULT_RETRIES): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'kai-chronicles-reborn-downloader/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function resolveProjectAonDownloadUrl(sourceUrl: string): Promise<DownloadResolution> {
  if (!isHttpUrl(sourceUrl)) {
    throw new Error(`Invalid URL: ${sourceUrl}`);
  }

  if (hasZipExtension(sourceUrl)) {
    return { kind: 'zip', url: sourceUrl };
  }

  if (hasHtmlExtension(sourceUrl)) {
    return { kind: 'html', url: sourceUrl };
  }

  const html = await fetchTextWithRetry(sourceUrl);
  const $ = load(html);
  const candidates: Array<{ kind: DownloadKind; score: number; url: string }> = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) {
      return;
    }

    const text = normalizeText($(el).text());
    const absoluteUrl = toAbsoluteUrl(href, sourceUrl);

    if (hasZipExtension(absoluteUrl)) {
      candidates.push({ kind: 'zip', score: 100, url: absoluteUrl });
      return;
    }

    if (hasHtmlExtension(absoluteUrl)) {
      const score = /single page|view online|html/i.test(text) ? 60 : 20;
      candidates.push({ kind: 'html', score, url: absoluteUrl });
    }
  });

  candidates.sort((left, right) => right.score - left.score);
  const preferred = candidates[0];

  if (!preferred) {
    throw new Error(`No downloadable HTML or ZIP link found on page: ${sourceUrl}`);
  }

  if (preferred.kind === 'zip') {
    return preferred;
  }

  const zipCandidate = candidates.find((candidate) => candidate.kind === 'zip');
  return zipCandidate || preferred;
}

async function downloadToFile(url: string, filePath: string, retries = DEFAULT_RETRIES) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'kai-chronicles-reborn-downloader/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('Empty response body');
      }

      await pipeline(Readable.fromWeb(response.body as globalThis.ReadableStream<Uint8Array>), createWriteStream(filePath));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(500 * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function extractZip(zipPath: string, extractedDir: string) {
  await fs.mkdir(extractedDir, { recursive: true });
  await pipeline(createReadStream(zipPath), unzipper.Extract({ path: extractedDir }));
}

export async function downloadBook(bookId: string, url: string): Promise<void> {
  if (!bookId.trim()) {
    throw new Error('bookId is required');
  }

  const resolution = await resolveProjectAonDownloadUrl(url);
  const bookDir = path.resolve('books', bookId);
  const downloadName = resolution.kind === 'zip' ? 'source.zip' : 'source.html';
  const downloadPath = path.join(bookDir, downloadName);

  console.log(`[${bookId}] resolving source: ${url}`);
  console.log(`[${bookId}] selected ${resolution.kind.toUpperCase()} -> ${resolution.url}`);

  await fs.mkdir(bookDir, { recursive: true });
  await downloadToFile(resolution.url, downloadPath);
  console.log(`[${bookId}] saved ${downloadName}`);

  if (resolution.kind === 'zip') {
    const extractedDir = path.join(bookDir, 'extracted');
    await extractZip(downloadPath, extractedDir);
    console.log(`[${bookId}] extracted archive to ${extractedDir}`);
  }
}

export const PROJECT_AON_BOOKS: Record<string, ProjectAonBookConfig> = {
  book1: {
    bookId: 'book1',
    sourceUrl: 'https://www.projectaon.org/en/Main/FlightFromTheDarkWithCovers',
  },
};
