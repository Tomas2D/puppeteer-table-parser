import { GetColumnIndexType, GroupByOptions } from './types';

const takeFirstHandler = (rows: string[][]) => rows[0];

export function groupBy(
  rows: string[][],
  { cols, handler = takeFirstHandler }: GroupByOptions,
  getColumnIndex: GetColumnIndexType,
): string[][] {
  const rowsByKey = new Map<string, string[][]>();

  rows.forEach((row) => {
    const key = cols.map((col) => row[getColumnIndex(col)]).join('-');
    if (!rowsByKey.has(key)) {
      rowsByKey.set(key, []);
    }
    rowsByKey.get(key)!.push(row);
  });

  return Array.from(rowsByKey.values()).map((rows) => {
    if (rows.length > 1) {
      return handler(rows, getColumnIndex);
    }
    return rows[0];
  });
}
