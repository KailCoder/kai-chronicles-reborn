Project Aon Downloader MVP
--------------------------

Architecture
- `download_projectaon.ts` is the CLI entry point.
- `projectaon_downloader.ts` holds the reusable logic.
- Downloaded files go into `books/{bookId}/`.
- ZIP downloads are extracted into `books/{bookId}/extracted/`.

Resolution strategy
- If the URL already points to `.zip`, download it directly.
- If the URL already points to `.html`, `.htm`, or `.xhtml`, download it directly.
- Otherwise fetch the Project Aon page and select the best public link.
- ZIP is preferred when both ZIP and HTML are available.

Usage
```bash
npm run download:projectaon -- book1
```

Or pass a custom public URL:
```bash
npm run download:projectaon -- book1 https://www.projectaon.org/en/Main/FlightFromTheDarkWithCovers
```

Folder layout
```
books/
  book1/
    source.zip   # or source.html
    extracted/
```

Notes
- This MVP does not parse HTML into JSON. It only downloads and extracts files.
- The `books/` folder is ignored by git so official downloads remain local by default.
