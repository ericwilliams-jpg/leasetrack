import { loadConfig } from './config.js';
import { writeRowsToSheet } from './googleSheets.js';
import { LeaseTrackClient, SheetRow } from './leasetrack.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const client = new LeaseTrackClient(config);

  const combinedRows: SheetRow[] = [];
  const failures: Array<{ marketId: number; error: string }> = [];

  try {
    console.log('Starting browser login...');
    await client.init();
    console.log('Login successful. Downloading market reports...');

    for (const marketId of config.marketIds) {
      try {
        const rows = await client.fetchMarketRows(marketId);
        if (rows.length === 0) {
          console.log(`Market ${marketId}: no rows returned`);
          continue;
        }

        if (combinedRows.length === 0) {
          combinedRows.push(...rows);
        } else {
          combinedRows.push(...rows.slice(1));
        }

        console.log(`Market ${marketId}: added ${Math.max(rows.length - 1, 0)} data rows`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push({ marketId, error: message });
        console.error(`Market ${marketId} failed: ${message}`);
      }
    }
  } finally {
    await client.close().catch((error) => {
      console.error('Failed closing browser:', error);
    });
  }

  console.log(`Writing ${Math.max(combinedRows.length - 1, 0)} rows to Google Sheets...`);
  await writeRowsToSheet(config, combinedRows);
  console.log('Google Sheets update complete.');

  if (failures.length > 0) {
    console.error('Failures:', JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
