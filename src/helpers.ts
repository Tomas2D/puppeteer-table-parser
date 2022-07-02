import { ExtraCol, ExtraColsMapper, ParserSettings } from './types';

export const extraColsMapperFactory = (extraCols: ExtraCol[]): ExtraColsMapper => {
  if (extraCols.length === 0) {
    return (row) => row;
  }

  const withPos: Required<ExtraCol[]> = extraCols
    .filter((extraCol) => extraCol.position !== undefined)
    .sort((a, b) => {
      return a.position! - b.position!;
    });

  // Append cols without position
  const withoutPos = extraCols.filter((extraCol) => extraCol.position === undefined);

  return (row: string[], key: keyof ExtraCol) => {
    const newRow = row.slice();

    withPos.forEach((extraCol) => {
      newRow.splice(extraCol.position!, 0, String(extraCol[key]));
    });

    return newRow.concat(withoutPos.map((extraCol) => String(extraCol[key])));
  };
};

export const validateSettings = (settings: Required<ParserSettings>): void => {
  // Validate extraCols mapping
  const { extraCols, temporaryColNames, allowedColNames } = settings;

  const hasConflict = extraCols.some((a) =>
    extraCols.find((b) => a !== b && a.position === b.position),
  );

  if (hasConflict) {
    throw new Error('One or more `extraCols` have same position!');
  }

  for (const colName of temporaryColNames) {
    if (!Object.prototype.hasOwnProperty.call(allowedColNames, colName)) {
      throw new Error(`Entry ${colName} in 'temporaryColNames' must exists in 'allowedColNames'!`);
    }
  }

  const allowedColNamesValues = Object.values(allowedColNames);
  for (const { colName } of extraCols) {
    if (allowedColNamesValues.includes(colName)) {
      throw new Error(`'${colName}' in 'extraCols' has same name as column in 'allowedColNames'!`);
    }
  }

  if (!settings.asArray && settings.rowValuesAsArray) {
    throw new Error(
      `'rowValuesAsArray' can be set to true only and only if 'asArray' is also true!`,
    );
  }

  if (!Array.isArray(settings.optionalColNames)) {
    throw new Error(`'optionalColNames' must be an "array"`);
  }
  for (const optionalColName of settings.optionalColNames) {
    if (!allowedColNamesValues.includes(optionalColName)) {
      throw new Error(
        `'${optionalColName}' in 'optionalColNames' does not exists in 'allowedColNames'!`,
      );
    }
  }
};

export const removeKeysByValues = <T extends Record<string, string>>(
  { ...obj }: T,
  keys: string[],
): T => {
  Object.entries(obj).forEach(([key, value]) => {
    if (keys.includes(value)) {
      console.info(`Deleting ${key}`);
      delete obj[key];
    }
  });
  return obj;
};

export const diffFromSource = <T>(source: T[], target: T[]): T[] => {
  return source.filter((x) => !target.includes(x));
};

export const omitUndefined = <T extends Record<string, any>>(source: T): Exclude<T, undefined> => {
  const definedPairs = Object.entries(source).filter(([, val]) => val !== undefined)
  return Object.fromEntries(definedPairs) as Exclude<T, undefined>
}
