import fs from 'fs/promises';
import path from 'path';
import { importProjectAonBook } from './projectaon_parser.js';

async function main() {
  const defaultInput = path.resolve('books', 'book1', 'extracted', 'en', 'xhtml', 'lw', '01fftd');
  const defaultOutput = path.resolve('src', 'content', 'lobo1.json');
  const [inputArg, outputArg] = process.argv.slice(2);
  const inputPath = inputArg ? path.resolve(inputArg) : defaultInput;
  const outputPath = outputArg ? path.resolve(outputArg) : defaultOutput;

  const story = await importProjectAonBook(inputPath);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(story, null, 2), 'utf8');
  console.log(`Imported ${Object.keys(story.sections).length} sections -> ${outputPath}`);
}

main().catch((error) => {
  console.error('Import failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
