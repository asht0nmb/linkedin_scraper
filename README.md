# LinkedIn Recruiter Scraper

A simple Node.js + Playwright script to extract names from LinkedIn Recruiter search results and export them to CSV.

## Table of Contents

1. [Features](#features)  
2. [Prerequisites](#prerequisites)  
3. [Installation](#installation)  
4. [Configuration](#configuration)  
5. [Usage](#usage)  
6. [Scripts](#scripts)  
7. [Customization & Tuning](#customization--tuning)  
8. [License](#license)  

---

## Features

- Headed or headless Chromium via Playwright  
- Incremental scrolling to load all results  
- Pagination support (handles the `start` parameter automatically)  
- CSV output per filter, deduplicated  
- Graceful cleanup on Ctrl + C, writes partial CSV  
- Fully configurable via `config.json`  

---

## Prerequisites

- Node.js v16+  
- npm (bundled with Node.js)  
- A LinkedIn Recruiter seat with saved-search URLs
---

## Installation

```bash
git clone https://github.com/asht0nmb/linkedin_scraper.git
cd linkedin_scraper
npm install          # installs dependencies & downloads Chromium
cp config.template.json config.json
```

---

## Configuration

Open `config.json` and update:

```json
{
  "filters": [
    {
      "name": "your_filter_name",
      "url": "https://www.linkedin.com/talent/...&start=0&uiOrigin=..."
    }
    // add more filters as needed
  ],
  "navigationWait": 5000,    // ms to wait after each page load
  "scrollDistance": 200,     // px per scroll step
  "scrollWait": 500,         // ms between scroll steps
  "nameSelector": "span[data-test-row-lockup-full-name] a"
}
```

- **filters**: array of `{ name, url }`—the URL must include your saved search and `start=0`.  
- **navigationWait**, **scrollDistance**, **scrollWait**: tweak for your network/machine speed.  
- **nameSelector**: CSS selector for the profile name element.  

> **Note:** `PER_PAGE` is hard-coded to 25 in `scrape.js` (LinkedIn shows 25 profiles per page).

---

## Usage

```bash
npm run scrape
```

1. The script launches Chromium and navigates to your first filter’s URL.  
2. Log in (complete 2FA) and press **ENTER** in the terminal.  
3. It will iterate each filter, paginate, scroll, collect names, and write CSVs:

   ```text
   ▶️  Scraping filter: your_filter_name
     → Navigating to start=0
     • Got 25 names
     → Navigating to start=25
     • Got 18 names
   ✅ Wrote 43 names to linkedin_names_your_filter_name.csv
   ```

4. When complete, the browser closes and you’ll see `All done!`.

---

## Scripts

| Command           | Description                                          |
|-------------------|------------------------------------------------------|
| `npm install`     | Install dependencies & auto-download Chromium        |
| `npm run scrape`  | Run the scraper                                      |
| `npm test`        | (stub) placeholder                                   |

---

## Customization & Tuning

- **Headless mode**: set `headless: true` in `chromium.launch()`  
- **Output directory**: adjust the CSV file path in `scrape.js`  
- **Add columns**: modify the CSV writer header in `scrape.js`  
- **Error handling**: extend the Ctrl + C handler or wrap calls in `try/catch`  

---

## License

MIT © 2025 asht0nmb
```
