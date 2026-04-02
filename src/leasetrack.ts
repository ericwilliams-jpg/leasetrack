import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as XLSX from 'xlsx';
import { AppConfig } from './config.js';

export type SheetRow = (string | number | boolean | null)[];

export class LeaseTrackClient {
  private browser?: Browser;
  private context?: BrowserContext;
  private page?: Page;

  constructor(private readonly config: AppConfig) {}

  async init(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.config.headless,
      slowMo: this.config.slowMoMs
    });

    this.context = await this.browser.newContext({ acceptDownloads: true });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.config.navTimeoutMs);

    await this.login();
  }

  async close(): Promise<void> {
    await this.context?.close();
    await this.browser?.close();
  }

  private getPage(): Page {
    if (!this.page) throw new Error('Browser page not initialized');
    return this.page;
  }

  private getContext(): BrowserContext {
    if (!this.context) throw new Error('Browser context not initialized');
    return this.context;
  }

  async login(): Promise<void> {
    const page = this.getPage();
    await page.goto(this.config.loginUrl, { waitUntil: 'domcontentloaded' });

    const currentUrl = page.url();
    if (!this.config.successUrlRegex.test(currentUrl)) {
      await page.locator(this.config.userSelector).first().fill(this.config.username);
      await page.locator(this.config.passwordSelector).first().fill(this.config.password);
      await Promise.all([
        page.waitForLoadState('networkidle'),
        page.locator(this.config.submitSelector).first().click()
      ]);
    }

    await page.waitForURL((url) => this.config.successUrlRegex.test(url.toString()), {
      timeout: this.config.navTimeoutMs
    });
  }

  async getCookieHeader(): Promise<string> {
    const cookies = await this.getContext().cookies(this.config.baseUrl);
    return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
  }

  async fetchMarketRows(marketId: number): Promise<SheetRow[]> {
    const cookieHeader = await this.getCookieHeader();
    const reportUrl = `${this.config.baseUrl}/app/dashboard/records/report?id=${marketId}`;
    const referer = this.config.reportRefererTemplate.replace('{marketId}', String(marketId));

    const response = await fetch(reportUrl, {
      headers: {
        Cookie: cookieHeader,
        Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        Referer: referer,
        Origin: this.config.baseUrl,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
      },
      redirect: 'manual'
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location') || '';
      throw new Error(`Market ${marketId} redirected to login or another page: ${location}`);
    }

    if (!response.ok) {
      throw new Error(`Market ${marketId} failed with HTTP ${response.status}`);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('spreadsheetml') && !contentType.includes('octet-stream') && !contentType.includes('application/zip')) {
      const text = await response.text();
      throw new Error(`Market ${marketId} returned ${contentType || 'unknown content-type'}: ${text.slice(0, 300)}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    return parseWorkbookRows(buffer, marketId);
  }
}

function parseWorkbookRows(buffer: Buffer, marketId: number): SheetRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error(`Market ${marketId} workbook has no sheets`);

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(worksheet, {
    header: 1,
    raw: false,
    defval: ''
  });

  const cleaned = rows.filter((row) => row.some((cell) => String(cell ?? '').trim() !== ''));
  if (cleaned.length === 0) return [];

  const header = cleaned[0].map((cell) => String(cell ?? ''));
  const dataRows = cleaned.slice(1);
  const output: SheetRow[] = [header.concat('MarketID')];

  for (const row of dataRows) {
    output.push(row.concat(String(marketId)));
  }

  return output;
}
