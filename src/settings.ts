import { FullParserSettings, ParserSettings, ParserSettingsOptional } from './types';
import { InvalidSettingsError } from './errors';
import { omitUndefined } from './helpers';

export const defaultSettings: ParserSettingsOptional = {
  extraCols: [],
  withHeader: true,
  csvSeparator: ';',
  newLine: '\n',
  rowValidator: () => true,
  rowTransform: () => {},
  asArray: false,
  rowValuesAsArray: false,
  temporaryColNames: [],
  colFilter: (elText) => elText.join(' '),
  colParser: (value) => value.trim(),
  optionalColNames: [],
  reverseTraversal: false,
  headerRowsSelector: 'thead tr',
  bodyRowsSelector: 'tbody tr',
};

export function preprocessSettings(options: ParserSettings): Required<ParserSettings> {
  const settings: FullParserSettings = {
    ...defaultSettings,
    ...omitUndefined(options),
  };

  validateSettings(settings);
  return settings;
}

export function validateSettings(
  settings: Required<ParserSettings>,
): asserts settings is Required<ParserSettings> {
  const { extraCols, temporaryColNames, allowedColNames } = settings;

  const hasConflict = extraCols
    .filter((col) => col.position !== undefined)
    .some((a) => extraCols.find((b) => a !== b && a.position === b.position));

  if (hasConflict) {
    throw new InvalidSettingsError('One or more `extraCols` have same position!');
  }

  for (const colName of temporaryColNames) {
    if (!Object.prototype.hasOwnProperty.call(allowedColNames, colName)) {
      throw new InvalidSettingsError(
        `Entry ${colName} in 'temporaryColNames' must exists in 'allowedColNames'!`,
      );
    }
  }

  const allowedColNamesValues = Object.values(allowedColNames);
  for (const { colName } of extraCols) {
    if (allowedColNamesValues.includes(colName)) {
      throw new InvalidSettingsError(
        `'${colName}' in 'extraCols' has same name as column in 'allowedColNames'!`,
      );
    }
  }

  if (!settings.asArray && settings.rowValuesAsArray) {
    throw new InvalidSettingsError(
      `'rowValuesAsArray' can be set to true only and only if 'asArray' is also true!`,
    );
  }

  if (!Array.isArray(settings.optionalColNames)) {
    throw new InvalidSettingsError(`'optionalColNames' must be an "array"`);
  }
  for (const optionalColName of settings.optionalColNames) {
    if (!allowedColNamesValues.includes(optionalColName)) {
      throw new InvalidSettingsError(
        `'${optionalColName}' in 'optionalColNames' does not exists in 'allowedColNames'!`,
      );
    }
  }
}
