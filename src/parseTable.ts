import { FullParserSettings, RowValidationPolicy } from './types';
import { extraColsMapperFactory, getColumnsInfo } from './helpers';
import { ElementHandle } from 'puppeteer';
import { InvalidSettingsError } from './errors';
import PipelineExecutor from './pipelineExecutor';
import { groupBy } from './aggregations';
export function parseTableFactory(settings: FullParserSettings) {
  const extraColsMapper = extraColsMapperFactory(settings.extraCols);

  const getHeaderRows = (table: ElementHandle) => {
    return settings.headerRowsSelector
      ? table.$$(settings.headerRowsSelector)
      : Promise.resolve([]);
  };

  const getBodyRows = (table: ElementHandle) => {
    return table.$$(settings.bodyRowsSelector);
  };

  const getOutputHeaderRow = (missingColNames: string[]) => {
    const headerRowRaw = Object.values(settings.allowedColNames);
    const sortedHeader = extraColsMapper(headerRowRaw, 'colName');

    return sortedHeader.filter((key) => !missingColNames.includes(key));
  };

  const getRowStructureValidator = (allowedIndexes: Record<string, number>) => {
    if (settings.rowValidationPolicy === RowValidationPolicy.NONE) {
      return () => true;
    }
    if (settings.rowValidationPolicy === RowValidationPolicy.NON_EMPTY) {
      return (rows: string[]) => rows.length > 0;
    }
    if (settings.rowValidationPolicy === RowValidationPolicy.EXACT_MATCH) {
      return (rows: string[]) => rows.length === Object.keys(allowedIndexes).length;
    }
    throw new InvalidSettingsError('Unknown mode for the "rowValidationPolicy"');
  };

  const getRowsData =
    (allowedIndexes: Record<string, number>) =>
    (row: ElementHandle): Promise<string[]> =>
      row.$$eval(
        'td',
        (cells: HTMLElement[], allowedIndexes: Record<string, number>) => {
          return cells
            .map((cell, realIndex) => [cell, realIndex])
            .filter((_, realIndex) => allowedIndexes[realIndex] !== undefined)
            .sort((a, b) => {
              const indexA = allowedIndexes[a[1] as number];
              const indexB = allowedIndexes[b[1] as number];

              return indexA - indexB;
            })
            .map(([cell]): string => (cell as HTMLElement).innerText);
        },
        allowedIndexes,
      );

  return async (table: ElementHandle, addHeader: boolean) => {
    await table.evaluate((el) => el.scrollIntoView());

    const headerRows: ElementHandle[] = await getHeaderRows(table);
    const bodyRows: ElementHandle[] = await getBodyRows(table);

    if (headerRows.length === 0 && bodyRows.length === 0) {
      return [];
    }

    const headerRow: ElementHandle = headerRows.length > 0 ? headerRows.shift() : bodyRows.shift();

    const { indexes, getColumnIndex, missingColNames } = await getColumnsInfo(
      settings,
      headerRow,
      extraColsMapper,
    );

    if (settings.reverseTraversal) {
      bodyRows.reverse();
    }

    let parsedRows = new PipelineExecutor<string[][], string[][]>()
      .addFilter(getRowStructureValidator(indexes.allowed))
      .addMap((row) => extraColsMapper(row, 'data'))
      .addFilter((row, index, rows) => settings.rowValidator(row, getColumnIndex, index, rows))
      .addMap((row) => row.map((cell, index) => settings.colParser(cell, index, getColumnIndex)))
      .addTransform((row) => settings.rowTransform(row, getColumnIndex))
      .execute(await Promise.all(bodyRows.map(getRowsData(indexes.allowed))));

    if (settings.groupBy) {
      parsedRows = groupBy(parsedRows, settings.groupBy, getColumnIndex);
    }

    if (addHeader) {
      const headerRow = getOutputHeaderRow(missingColNames);
      parsedRows.unshift(headerRow);
    }

    return new PipelineExecutor<
      string[][],
      typeof settings.rowValuesAsArray extends true ? string[][] : string[]
    >()
      .addMap((row) => row.filter((_, index: number) => !indexes.excluded.includes(index)))
      .addMap((row) => (settings.rowValuesAsArray ? row : row.join(settings.csvSeparator)))
      .execute(parsedRows);
  };
}
