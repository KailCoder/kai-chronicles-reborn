import { downloadBook, PROJECT_AON_BOOKS } from './projectaon_downloader.js';

async function main() {
  const [bookIdArg, urlArg] = process.argv.slice(2);
  const bookId = bookIdArg || 'book1';

  const config = PROJECT_AON_BOOKS[bookId];
  const sourceUrl = urlArg || config?.sourceUrl;

  if (!sourceUrl) {
    console.error(`Unknown bookId "${bookId}". Provide a URL or add it to PROJECT_AON_BOOKS.`);
    process.exit(2);
  }

  await downloadBook(bookId, sourceUrl);
}

main().catch((error) => {
  console.error('Download failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
