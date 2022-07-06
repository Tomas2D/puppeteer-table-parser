import { ExtraCol, ExtraColsMapper } from './types';

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

export const diffFromSource = <T>(source: T[], target: T[]): T[] => {
  return source.filter((x) => !target.includes(x));
};

export const omitUndefined = <T extends Record<string, any>>(source: T): Exclude<T, undefined> => {
  const definedPairs = Object.entries(source).filter(([, val]) => val !== undefined);
  return Object.fromEntries(definedPairs) as Exclude<T, undefined>;
};
