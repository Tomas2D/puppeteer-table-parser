import { FullParserSettings } from './types';
import { extraColsMapperFactory } from './helpers';
import { ElementHandle } from 'puppeteer';

export const parseTableFactory = (settings: FullParserSettings) => {
  const extraColsMapper = extraColsMapperFactory(settings.extraCols);

  return async (table: ElementHandle, addHeader: boolean): Promise<string[]> => {
    const headerRows: ElementHandle[] = await table.$$('thead tr');
    const rows: ElementHandle[] = await (table.$$('tbody tr') || (await table.$$('tr')));

    if (headerRows.length === 0 && rows.length === 0) {
      return [];
    }

    let header: ElementHandle;

    // first row is header, they use bad HTML semantic
    if (headerRows.length === 0) {
      header = rows.shift()!;
    } else {
      if (headerRows.length > 1) {
        console.warn('tableParser cannot handle multiple rows in header! Beware of it!');
      }
      header = headerRows.shift()!;
    }

    const allowedColNames = { ...settings.allowedColNames };
    const allowedColNamesKeys = Object.keys(settings.allowedColNames);
    const excludedKeyIndexes: number[] = [];

    // Sorted by finding which was first visited
    // first is index in which we traverse the table, second is final position
    const allowedIndexes: Record<string, number> = Object.fromEntries(
      (
        await header.$$eval(
          'td,th',
          // @ts-ignore
          (cells: HTMLElement[], newLine: string) => {
            return cells.map((cell: HTMLElement) => cell.innerText.split(newLine));
          },
          settings.newLine,
        )
      )
        .map((text: string[], realIndex: number) => {
          const colName = settings.colFilter(text as string[], realIndex);
          if (!Object.prototype.hasOwnProperty.call(allowedColNames, colName)) {
            return null;
          }

          delete allowedColNames[colName]; // for debug purpose
          return [realIndex, String(colName)];
        })
        .filter((pair: any) => pair !== null)
        .map((pair: any) => {
          const [realIndex, colName] = pair;

          const desiredIndex = allowedColNamesKeys.findIndex((key) => key === colName);
          if (settings.temporaryColNames.includes(colName)) {
            excludedKeyIndexes.push(desiredIndex);
          }
          return [realIndex, desiredIndex];
        }),
    );

    if (Object.keys(allowedIndexes).length !== Object.keys(settings.allowedColNames).length) {
      console.info(`Not matched columns are following entries: `, allowedColNames);
      throw new Error('Number of filtered columns does not match to required columns count!');
    }

    const finalRows: string[] = (
      await Promise.all(
        rows.map((row) =>
          row.$$eval(
            'td',
            // @ts-ignore
            (cells: HTMLElement[], allowedIndexes: Record<string, number>) => {
              return cells
                .map((cell, realIndex) => [cell, realIndex])
                .filter((_, realIndex) => allowedIndexes[realIndex] !== undefined)
                .sort((a, b) => {
                  const indexA = allowedIndexes[a[1] as number];
                  const indexB = allowedIndexes[b[1] as number];

                  return indexA - indexB; // ASC
                })
                .map(([cell]): string => (cell as HTMLElement).innerText);
            },
            allowedIndexes,
          ),
        ),
      )
    )
      .map((row) => extraColsMapper(row, 'data'))
      .filter((row) => settings.rowValidator(row))
      .map((row) =>
        row
          .map(settings.colParser)
          .filter((_, index) => !excludedKeyIndexes.includes(index))
          .join(settings.csvSeparator),
      );

    if (addHeader) {
      const headerRow = Object.values(settings.allowedColNames);
      const sortedHeader = extraColsMapper(headerRow, 'colName');

      finalRows.unshift(
        sortedHeader
          .filter((_, index) => !excludedKeyIndexes.includes(index))
          .join(settings.csvSeparator),
      );
    }

    return finalRows;
  };
};
