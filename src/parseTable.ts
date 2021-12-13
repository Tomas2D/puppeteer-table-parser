import { FullParserSettings } from './types';
import { extraColsMapperFactory } from './helpers';
import { ElementHandle } from 'puppeteer';

export const parseTableFactory = (settings: FullParserSettings) => {
  const extraColsMapper = extraColsMapperFactory(settings.extraCols);
  const allowedColNamesKeys = Object.keys(settings.allowedColNames);

  return async (table: ElementHandle, addHeader: boolean) => {
    const headerRows: ElementHandle[] = await table.$$('thead tr');
    const rows: ElementHandle[] = (await table.$$('tbody tr')) || (await table.$$('tr'));

    if (headerRows.length === 0 && rows.length === 0) {
      return [];
    }

    let headerRow: ElementHandle;

    // First row is header (bad semantic)
    if (headerRows.length === 0) {
      headerRow = rows.shift()!;
    } else {
      if (headerRows.length > 1) {
        console.warn('Cannot handle multiple rows in header! Beware of it!');
      }
      headerRow = headerRows.shift()!;
    }

    const allowedColNamesDebug = { ...settings.allowedColNames };

    // Sorted by finding which was first visited
    // first is index in which we traverse the table, second is final position
    const allowedIndexes: Record<string, number> = Object.fromEntries(
      (
        await headerRow.$$eval(
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
          if (!Object.prototype.hasOwnProperty.call(settings.allowedColNames, colName)) {
            return null;
          }

          // for debug purpose!
          delete allowedColNamesDebug[colName];

          return [realIndex, String(colName)];
        })
        .filter((pair: any) => pair !== null)
        .map((pair: any) => {
          const [realIndex, colName] = pair;
          const desiredIndex = allowedColNamesKeys.findIndex((key) => key === colName);

          return [realIndex, desiredIndex];
        }),
    );

    if (Object.keys(allowedIndexes).length !== allowedColNamesKeys.length) {
      console.info(`Not matched columns are following entries: `, allowedColNamesDebug);
      throw new Error('Number of filtered columns does not match to required columns count!');
    }

    const excludedKeyIndexes: number[] = [];
    const colKeyToIndexWithExcluded: Map<string, number> = new Map<string, number>();
    extraColsMapper(allowedColNamesKeys, 'colName').forEach((key, index) => {
      colKeyToIndexWithExcluded.set(key, index);
      colKeyToIndexWithExcluded.set(settings.allowedColNames[key] || key, index);

      if (settings.temporaryColNames.includes(key)) {
        excludedKeyIndexes.push(index);
      }
    });

    const getColumnIndex = (colName: string): number => {
      const index = colKeyToIndexWithExcluded.get(colName);
      if (index === undefined) {
        throw new Error(`Invalid column name! '${colName}'`);
      }

      return index;
    };

    const finalRows = (
      await Promise.all(
        rows.map(
          (row): Promise<string[]> =>
            row.$$eval(
              'td',
              // @ts-expect-error
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
      .filter((row) => settings.rowValidator(row, getColumnIndex))
      .map((row) => row.map((cell, index) => settings.colParser(cell, index, getColumnIndex)))
      .map((row) => {
        settings.rowTransform(row, getColumnIndex);
        const filteredRow = row.filter((_, index) => !excludedKeyIndexes.includes(index));
        return settings.rowValuesAsArray ? filteredRow : filteredRow.join(settings.csvSeparator);
      });

    if (addHeader) {
      const headerRowRaw = Object.values(settings.allowedColNames);
      const sortedHeader = extraColsMapper(headerRowRaw, 'colName');

      const headerRow = sortedHeader.filter((_, index) => !excludedKeyIndexes.includes(index));

      finalRows.unshift(
        settings.rowValuesAsArray ? headerRow : headerRow.join(settings.csvSeparator),
      );
    }

    return finalRows as typeof settings.rowValuesAsArray extends true ? string[][] : string[];
  };
};
