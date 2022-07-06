import { ElementHandle, Page } from 'puppeteer';
import { ParserSettingsOptional, ParserSettings, FullParserSettings } from './types';
import { omitUndefined, validateSettings } from './helpers';
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
  rowValuesAsArray: false,
  temporaryColNames: [],
  colFilter: (elText) => elText.join(' '),
  colParser: (value) => value.trim(),
  optionalColNames: [],
  reverseTraversal: false,
};

async function retrieveTables(page: Page, selector: string) {
  await page.waitForSelector(selector);

  const elements: ElementHandle[] = await page.$$(selector);
  const elementsTypes: string[] = await Promise.all(
    elements.map((elHandle) => elHandle.evaluate((el: HTMLElement) => el.tagName)),
  );

  return elements.filter((el, index) => {
    const elType: string = elementsTypes[index];
    if (elType !== 'TABLE') {
      console.warn('Invalid selector! Element is not a table!');
      return false;
    }
    return true;
  });
}

export async function tableParser(
  page: Page,
  settings: Omit<ParserSettings, 'asArray'> & {
    asArray: true;
    rowValuesAsArray?: false;
  },
): Promise<string[]>;
export async function tableParser(
  page: Page,
  settings: Omit<ParserSettings, 'asArray' | 'rowValuesAsArray'> & {
    asArray: true;
    rowValuesAsArray: true;
  },
): Promise<string[][]>;
export async function tableParser(page: Page, options: ParserSettings): Promise<string>;
export async function tableParser<T extends ParserSettings>(
  page: Page,
  options: T,
): Promise<string | string[] | string[][]> {
  const settings: FullParserSettings = { ...defaultSettings, ...omitUndefined(options) };

  validateSettings(settings);

  const tables: ElementHandle[] = await retrieveTables(page, settings.selector);

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
