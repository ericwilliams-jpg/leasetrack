import { google } from 'googleapis';
import { AppConfig } from './config.js';
import { SheetRow } from './leasetrack.js';

export async function writeRowsToSheet(config: AppConfig, rows: SheetRow[]): Promise<void> {
  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = config.spreadsheetId;
  const sheetName = config.sheetName;

  await ensureSheetExists(sheets, spreadsheetId, sheetName);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A:ZZ`
  });

  if (rows.length === 0) return;

  const normalized = rows.map((row) => row.map((value) => (value == null ? '' : String(value))));

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${quoteSheetName(sheetName)}!A1`,
    valueInputOption: 'RAW',
    requestBody: {
      values: normalized
    }
  });
}

async function ensureSheetExists(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetName: string
): Promise<void> {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existing = meta.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);
  if (existing) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }
      ]
    }
  });
}

function quoteSheetName(sheetName: string): string {
  return /[\s'!]/.test(sheetName) ? `'${sheetName.replace(/'/g, "''")}'` : sheetName;
}
