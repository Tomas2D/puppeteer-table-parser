import { ElementHandle, Page } from 'puppeteer';
import {
  ParserSettings,
  FullParserSettings,
  OmitOrFalsy,
  ExtraCol,
  RowTransformFn,
  RowValidatorFn,
} from './types';
import { parseTableFactory } from './parseTable';
import { mergeParserSettings } from './merger';
import { preprocessSettings } from './settings';
import { NoTablesFoundError } from './errors';

async function retrieveTables(page: Page, selector: string) {
  await page.waitForSelector(selector);

  const elements: ElementHandle[] = await page.$$(selector);
  const elementsTypes: string[] = await Promise.all(
    elements.map((elHandle) => elHandle.evaluate((el) => el.tagName)),
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
    rowValuesAsObject?: false;
  },
): Promise<string[]>;
export async function tableParser(
  page: Page,
  settings: Omit<ParserSettings, 'asArray' | 'rowValuesAsArray'> & {
    asArray: true;
    rowValuesAsArray: true;
    rowValuesAsObject?: false;
  },
): Promise<string[][]>;
export async function tableParser<T extends string, U extends string, V extends string>(
  page: Page,
  settings: Omit<
    ParserSettings,
    | 'asArray'
    | 'rowValuesAsArray'
    | 'rowValuesAsObject'
    | 'allowedColNames'
    | 'extraCols'
    | 'rowTransform'
    | 'rowValidator'
    | 'temporaryColNames'
  > & {
    asArray: boolean;
    rowValuesAsObject: true;
    rowValuesAsArray?: false;
    allowedColNames: Record<V, T>;
    extraCols?: Array<ExtraCol<U>>;
    rowTransform?: RowTransformFn<T | U>;
    rowValidator?: RowValidatorFn<T | U>;
    temporaryColNames?: Array<V>;
  },
): Promise<Array<Record<T | U, string>>>;
export async function tableParser(
  page: Page,
  options: OmitOrFalsy<ParserSettings, 'asArray' | 'rowValuesAsObject' | 'rowValuesAsArray'>,
): Promise<string>;
export async function tableParser<T extends ParserSettings>(page: Page, options: T) {
  const settings: FullParserSettings = preprocessSettings(options);

  const tables: ElementHandle[] = await retrieveTables(page, settings.selector);

  if (tables.length === 0) {
    throw new NoTablesFoundError('No tables found! Probably wrong table selector!');
  }

  const parseTable = parseTableFactory(settings);

  const tableResults: Array<Awaited<ReturnType<typeof parseTable>>> = [];
  let headerFound = false;

  for (const table of tables) {
    const withHeader = settings.withHeader && !settings.rowValuesAsObject && !headerFound;
    const data = await parseTable(table, withHeader);

    if (data.length > 0 && withHeader) {
      headerFound = true;
    }
    tableResults.push(data);
  }

  const filteredDataTables = tableResults.flat().filter(Boolean);

  if (!settings.asArray) {
    return filteredDataTables.join(settings.newLine);
  }

  return filteredDataTables;
}

export { mergeParserSettings };
export * from './types';
export * from './errors';
