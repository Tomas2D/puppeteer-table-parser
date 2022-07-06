import { FullParserSettings } from './types';
import { extraColsMapperFactory, diffFromSource } from './helpers';
import { ElementHandle } from 'puppeteer';
import { InvalidColumnError, MissingRequiredColumnsError } from './errors';

export function parseTableFactory(settings: FullParserSettings) {
  const extraColsMapper = extraColsMapperFactory(settings.extraCols);
  const allowedColNamesKeys = Object.keys(settings.allowedColNames);

  const getHeaderRows = (table: ElementHandle) => {
    return settings.headerRowsSelector
      ? table.$$(settings.headerRowsSelector)
      : Promise.resolve([]);
  };

  const getBodyRows = (table: ElementHandle) => {
    return table.$$(settings.bodyRowsSelector);
  };

  const getOutputHeaderRow = (
    excludedKeyIndexes: number[],
    nonFoundedColNames: FullParserSettings['allowedColNames'],
  ) => {
    const headerRowRaw = Object.values(settings.allowedColNames);
    const sortedHeader = extraColsMapper(headerRowRaw, 'colName');

    const headerRow = sortedHeader
      .filter((_, index) => !excludedKeyIndexes.includes(index))
      .filter((key) => !Object.values(nonFoundedColNames).includes(key));

    return settings.rowValuesAsArray ? headerRow : headerRow.join(settings.csvSeparator);
  };

  const filterSortCols =
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
    const headerRows: ElementHandle[] = await getHeaderRows(table);
    const bodyRows: ElementHandle[] = await getBodyRows(table);

    if (headerRows.length === 0 && bodyRows.length === 0) {
      return [];
    }

    const headerRow: ElementHandle =
      headerRows.length > 0 ? headerRows.shift()! : bodyRows.shift()!;

    if (settings.reverseTraversal) {
      bodyRows.reverse();
    }

    // Will be updated during parsing and not found columns will be deleted
    const nonFoundedColNames = { ...settings.allowedColNames };

    // Sorted by finding which was first visited
    // is index in which we traverse the table, second is final position
    const allowedIndexes: Record<string, number> = (
      await headerRow.$$eval(
        'td,th',
        (cells: Element[], newLine: string) => {
          return cells.map((cell) => (cell as HTMLTableCellElement).innerText.split(newLine));
        },
        settings.newLine,
      )
    ).reduce((acc, text: string[], realIndex: number) => {
      const colName = String(settings.colFilter(text, realIndex));

      if (settings.allowedColNames.hasOwnProperty(colName)) {
        delete nonFoundedColNames[colName];

        const desiredIndex = allowedColNamesKeys.findIndex((key) => key === colName);
        Object.assign(acc, { [realIndex]: desiredIndex });
      }

      return acc;
    }, {});

    const missingRequiredColumns = diffFromSource(
      Object.values(nonFoundedColNames),
      settings.optionalColNames,
    );
    if (missingRequiredColumns.length > 0) {
      console.warn(`Not matched columns are following entries: `, missingRequiredColumns);
      throw new MissingRequiredColumnsError(
        'Number of filtered columns does not match to required columns count!',
      );
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
        throw new InvalidColumnError(`Invalid column name! '${colName}'`);
      }

      return index;
    };

    const finalRows = (await Promise.all(bodyRows.map(filterSortCols(allowedIndexes))))
      .map((row) => extraColsMapper(row, 'data'))
      .filter((row, index, rows) => settings.rowValidator(row, getColumnIndex, index, rows))
      .map((row) => row.map((cell, index) => settings.colParser(cell, index, getColumnIndex)))
      .map((row) => {
        settings.rowTransform(row, getColumnIndex);

        const filteredRow = row.filter((_, index) => !excludedKeyIndexes.includes(index));
        return settings.rowValuesAsArray ? filteredRow : filteredRow.join(settings.csvSeparator);
      });

    if (addHeader) {
      const headerRow = getOutputHeaderRow(excludedKeyIndexes, nonFoundedColNames);
      finalRows.unshift(headerRow);
    }

    return finalRows as typeof settings.rowValuesAsArray extends true ? string[][] : string[];
  };
}
