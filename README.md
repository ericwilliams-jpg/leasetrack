# LeaseTrack Playwright Importer

This project logs into LeaseTrack with Playwright, downloads each market's `All_Residents_Report.xlsx`, combines the rows, and writes the result to a Google Sheet.

## What it does

1. Opens a real Chromium browser with Playwright
2. Logs into `https://secure.leasetrack.ai/app/portal/login`
3. Uses the authenticated browser session cookies to call the XLSX export endpoint for each market
4. Parses the first worksheet from each workbook
5. Writes the combined results to Google Sheets

## Local run

```bash
npm install
cp .env.example .env
npm run start
```

## Required environment variables

See `.env.example`.

The most important values are:

- `LT_USERNAME`
- `LT_PASSWORD`
- `LT_MARKET_IDS`
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SHEET_NAME`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`

## Google Cloud setup

Use your project:

- Project name: `leasetrack`
- Project ID: `leasetrack-492115`
- Project number: `1069546564209`

### 1. Enable the Google Sheets API

In Google Cloud Console, open the `leasetrack` project and enable:

- Google Sheets API

### 2. Create a service account

Create a service account for this app. Example name:

- `railway-leasetrack-writer`

Create a JSON key for that service account.

From the JSON, copy these into Railway variables:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` = `client_email`
- `GOOGLE_PRIVATE_KEY` = `private_key`

### 3. Share the spreadsheet with the service account

Share the target Google Sheet with the service account email as **Editor**.

## Railway deployment

### 1. Create a new Railway project

Use **Deploy from GitHub repo** and choose:

- `ericwilliams-jpg/leasetrack`

Railway will detect the `Dockerfile`.

### 2. Add environment variables

Add all values from `.env.example`, especially:

- LeaseTrack credentials
- Google service account values
- Spreadsheet ID and sheet name

### 3. Run mode

Recommended: deploy as a service or cron-style job.

If you want scheduled imports, create a Railway schedule/job that runs the container on your preferred cadence.

## Notes

- This app does not depend on a manually pasted browser cookie.
- It logs in fresh each run using Playwright.
- If LeaseTrack changes its login page selectors, update:
  - `LT_USER_SELECTOR`
  - `LT_PASSWORD_SELECTOR`
  - `LT_SUBMIT_SELECTOR`

## Repo structure

- `src/index.ts` - main runner
- `src/config.ts` - environment loading and validation
- `src/leasetrack.ts` - Playwright login and XLSX downloads
- `src/googleSheets.ts` - Google Sheets write logic
- `Dockerfile` - Railway-ready container

## First test

After setting env vars, run locally or on Railway and confirm logs like:

- `Login successful. Downloading market reports...`
- `Market 29133: added ... data rows`
- `Google Sheets update complete.`
