import type { ExtraCol, ExtraColsMapper } from './types';
import type { FullParserSettings } from './types';
import { ElementHandle } from 'puppeteer';
import { InvalidColumnError, MissingRequiredColumnsError } from './errors';

export const identity = <T>(value: T): T => value;

export const extraColsMapperFactory = (extraCols: ExtraCol[]): ExtraColsMapper => {
  if (extraCols.length === 0) {
    return identity;
  }

  const withPos = extraCols
    .filter((extraCol): extraCol is Required<ExtraCol> => extraCol.position !== undefined)
    .sort((a, b) => {
      return a.position! - b.position!;
    });

  // Append columns without a concrete position
  const withoutPos = extraCols.filter((extraCol) => extraCol.position === undefined);

  return (row: string[], key: keyof ExtraCol = 'data') => {
    const newRow = row.slice();

    withPos.forEach((extraCol) => {
      newRow.splice(extraCol.position, 0, String(extraCol[key]));
    });

    return newRow.concat(withoutPos.map((extraCol) => String(extraCol[key])));
  };
};

export async function getColumnsInfo(
  settings: FullParserSettings,
  headerRow: ElementHandle,
  extraColsMapper: ReturnType<typeof extraColsMapperFactory>,
) {
  const allowedColNamesKeys = Object.keys(settings.allowedColNames);

  // Will be updated during parsing and not found columns will be deleted
  const missingColNames = { ...settings.allowedColNames };

  // Sorted by finding which was first visited
  // is index in which we traverse the table, second is final position
  const allowedIndexes: Record<number, number> = (
    await headerRow.$$eval(
      settings.headerRowsCellSelector,
      (cells: Element[], newLine: string) => {
        return cells.map((cell) => (cell as HTMLTableCellElement).innerText.split(newLine));
      },
      settings.newLine,
    )
  ).reduce((acc, text: string[], realIndex: number) => {
    const colName = String(settings.colFilter(text, realIndex));

    if (settings.allowedColNames.hasOwnProperty(colName)) {
      delete missingColNames[colName];

      const desiredIndex = allowedColNamesKeys.findIndex((key) => key === colName);
      Object.assign(acc, { [realIndex]: desiredIndex });
    }

    return acc;
  }, {});

  const missingRequiredColumns = diffFromSource(
    Object.values(missingColNames),
    settings.optionalColNames,
  );
  if (missingRequiredColumns.length > 0) {
    console.warn(`Not matched columns are following entries: `, missingRequiredColumns);
    throw new MissingRequiredColumnsError(
      'Number of filtered columns does not match to required columns count!',
    );
  }

  const excludedKeyIndexes: number[] = [];
  const colKeyToIndexWithExcluded = new Map<string, number>();
  const colIndexToKeyWithExcluded = new Map<number, string>();
  extraColsMapper(allowedColNamesKeys, 'colName').forEach((key, index) => {
    colKeyToIndexWithExcluded.set(key, index);
    colIndexToKeyWithExcluded.set(index, key);

    const value = settings.allowedColNames[key] || key;
    colKeyToIndexWithExcluded.set(value, index);
    colIndexToKeyWithExcluded.set(index, value);

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

  const getColumnName = (colIndex: number) => {
    const value = colIndexToKeyWithExcluded.get(colIndex);
    if (value === undefined) {
      throw new InvalidColumnError(`Column with index '${colIndex}' does not exist!`);
    }

    return value;
  };

  return {
    indexes: {
      allowed: allowedIndexes,
      excluded: excludedKeyIndexes,
    },
    missingColNames: Object.values(missingColNames),
    getColumnIndex,
    getColumnName,
  };
}

export const diffFromSource = <T>(source: T[], target: T[]): T[] => {
  return source.filter((x) => !target.includes(x));
};

export const omitUndefined = <T extends Record<string, any>>(source: T): Exclude<T, undefined> => {
  const definedPairs = Object.entries(source).filter(([, val]) => val !== undefined);
  return Object.fromEntries(definedPairs) as Exclude<T, undefined>;
};
