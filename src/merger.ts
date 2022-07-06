import type { MergeParserSettings } from './types';

export const mergeParserSettings = (
  to: MergeParserSettings,
  from: MergeParserSettings,
  ignoredAllowedColumns: string[] = [],
): MergeParserSettings => {
  const newConfig: MergeParserSettings = {
    temporaryColNames: to.temporaryColNames.slice(),
    extraCols: to.extraCols.slice(),
    allowedColNames: Object.assign({}, to.allowedColNames),
  };

  newConfig.extraCols.unshift(
    ...from.extraCols.map((extraCol) => {
      extraCol.data = extraCol.data || '';
      return extraCol;
    }),
  );
  from.temporaryColNames
    .filter((tempCol) => !newConfig.temporaryColNames.includes(tempCol))
    .forEach((tempCol) => newConfig.temporaryColNames.push(tempCol));

  // Get columns from general table
  const generalColNames = Object.entries(from.allowedColNames);

  // Merge them together
  generalColNames.reverse().forEach(([key, val], index) => {
    const realPosition = generalColNames.length - index - 1;

    // If column does not exist yet and is not excluded
    if (!newConfig.allowedColNames.hasOwnProperty(key) && !ignoredAllowedColumns.includes(key)) {
      const searchEntry = newConfig.extraCols.find((col) => col.colName === key);

      // Column already exists, just update position to match
      if (searchEntry) {
        searchEntry.position = realPosition;
        return;
      }

      // Insert new column
      newConfig.extraCols.unshift({
        colName: val,
        data: '',
        position: realPosition,
      });
    }
  });

  return newConfig;
};

export default mergeParserSettings;
