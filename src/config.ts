import 'dotenv/config';

export type AppConfig = {
  loginUrl: string;
  baseUrl: string;
  username: string;
  password: string;
  userSelector: string;
  passwordSelector: string;
  submitSelector: string;
  successUrlRegex: RegExp;
  reportRefererTemplate: string;
  marketIds: number[];
  spreadsheetId: string;
  sheetName: string;
  serviceAccountEmail: string;
  privateKey: string;
  headless: boolean;
  slowMoMs: number;
  navTimeoutMs: number;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'y'].includes(value.toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

function parseMarketIds(value: string): number[] {
  return value
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v));
}

function parseRegex(value: string): RegExp {
  if (value.startsWith('/') && value.lastIndexOf('/') > 0) {
    const lastSlash = value.lastIndexOf('/');
    const body = value.slice(1, lastSlash);
    const flags = value.slice(lastSlash + 1);
    return new RegExp(body, flags);
  }
  return new RegExp(value);
}

export function loadConfig(): AppConfig {
  const privateKeyRaw = requireEnv('GOOGLE_PRIVATE_KEY');

  return {
    loginUrl: requireEnv('LT_LOGIN_URL'),
    baseUrl: requireEnv('LT_BASE_URL'),
    username: requireEnv('LT_USERNAME'),
    password: requireEnv('LT_PASSWORD'),
    userSelector: process.env.LT_USER_SELECTOR?.trim() || 'input[name="email"]',
    passwordSelector: process.env.LT_PASSWORD_SELECTOR?.trim() || 'input[name="password"]',
    submitSelector: process.env.LT_SUBMIT_SELECTOR?.trim() || 'button[type="submit"], input[type="submit"]',
    successUrlRegex: parseRegex(process.env.LT_SUCCESS_URL_REGEX?.trim() || '/app/(agent/community|dashboard/home)'),
    reportRefererTemplate: process.env.LT_REPORT_REFERER_TEMPLATE?.trim() || 'https://secure.leasetrack.ai/app/dashboard/records?id={marketId}',
    marketIds: parseMarketIds(requireEnv('LT_MARKET_IDS')),
    spreadsheetId: requireEnv('GOOGLE_SPREADSHEET_ID'),
    sheetName: process.env.GOOGLE_SHEET_NAME?.trim() || 'Leasetrack',
    serviceAccountEmail: requireEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL'),
    privateKey: privateKeyRaw.replace(/\\n/g, '\n'),
    headless: parseBoolean(process.env.HEADLESS, true),
    slowMoMs: parseNumber(process.env.SLOW_MO_MS, 0),
    navTimeoutMs: parseNumber(process.env.NAV_TIMEOUT_MS, 60000)
  };
}
