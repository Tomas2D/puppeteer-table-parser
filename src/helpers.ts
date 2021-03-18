import { ExtraCol, ExtraColsMapper, ParserSettings } from './types';

export const extraColsMapperFactory = (extraCols: ExtraCol[]): ExtraColsMapper => {
  if (extraCols.length === 0) {
    return (row) => row;
  }

  const extraColsWithPos: Required<ExtraCol[]> = extraCols
    .filter((extraCol) => extraCol.position !== undefined)
    .sort((a, b) => {
      return a.position! - b.position!; // ASC
    });

  // Append cols without position
  const extraColsWithoutPos = extraCols.filter((extraCol) => extraCol.position === undefined);

  return (row: string[], key: keyof ExtraCol) => {
    const newRow = row.slice();

    extraColsWithPos.forEach((extraCol) => {
      newRow.splice(extraCol.position!, 0, String(extraCol[key]));
    });

    return newRow.concat(extraColsWithoutPos.map((extraCol) => String(extraCol[key])));
  };
};

export const validateSettings = (settings: Required<ParserSettings>): void => {
  // Validate extraCols mapping
  const { extraCols, temporaryColNames, allowedColNames } = settings;

  const hasConflict = extraCols.some((a) =>
    extraCols.find((b) => a !== b && a.position === b.position),
  );

  if (hasConflict) {
    throw new Error('One or more `extraCols` has same position!');
  }

  // Validate temporaryCols
  for (const colName of temporaryColNames) {
    if (!Object.prototype.hasOwnProperty.call(allowedColNames, colName)) {
      throw new Error(`Entry ${colName} in 'temporaryColNames' must exists in allowedColNames!`);
    }
  }
};
