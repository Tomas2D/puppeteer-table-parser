export const asObject =
  <T extends string>(getColumnName: (i: number) => T) =>
  (row: string[]): Record<T, string> => {
    return row.reduce((acc, value, index) => {
      const key = getColumnName(index);
      acc[key] = value;
      return acc;
    }, {} as Record<T, string>);
  };

export const asCsv = (separator: string) => (row: string[]) => {
  return row.join(separator);
};

export const asArray = () => (row: string[]) => {
  return row;
};
