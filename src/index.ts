import { ElementHandle, Page } from 'puppeteer';
import { ParserSettingsOptional, ParserSettings, FullParserSettings } from './types';
import { validateSettings } from './helpers';
import { parseTableFactory } from './parseTable';
import { mergeParserSettings } from './merger';

const defaultSettings: ParserSettingsOptional = {
  extraCols: [],
  withHeader: true,
  csvSeparator: ';',
  newLine: '\n',
  rowValidator: () => true,
  rowTransform: () => {},
  asArray: false,
  temporaryColNames: [],
  colFilter: (elText) => elText.join(' '),
  colParser: (value) => value.trim(),
};

export async function tableParser(
  page: Page,
  settings: ParserSettings & { asArray: true },
): Promise<string[]>;
export async function tableParser(page: Page, options: ParserSettings): Promise<string>;
export async function tableParser<T extends ParserSettings>(
  page: Page,
  options: T,
): Promise<string | string[]> {
  const settings: FullParserSettings = { ...defaultSettings, ...options };

  validateSettings(settings);

  const tables: ElementHandle[] = await Promise.all(
    (
      await page.$$(settings.selector)
    ).filter(async (table: ElementHandle) => {
      const nodeName: string = await table.evaluate((table: HTMLElement) => table.nodeName);
      if (nodeName.toUpperCase() !== 'TABLE') {
        console.warn('Invalid selector! Element is not table!');
        return false;
      }
      return true;
    }),
  );

  if (tables.length === 0) {
    throw new Error('No tables found! Probably wrong table selector!');
  }

  const parseTable = parseTableFactory(settings);

  let headerFound = false;
  const dataTables = [];

  for (const table of tables) {
    const withHeader = settings.withHeader && !headerFound;
    const data = await parseTable(table, withHeader);

    if (data.length > 0 && withHeader) {
      headerFound = true;
    }
    dataTables.push(data);
  }

  const filteredDataTables = dataTables.flat().filter(Boolean);
  return settings.asArray ? filteredDataTables : filteredDataTables.join(settings.newLine);
}

export default tableParser;

export { mergeParserSettings };
