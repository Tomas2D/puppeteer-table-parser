export interface ExtraCol<T extends string = string> {
  colName: T;
  data: string;
  position?: number;
}

export type GetColumnIndexType<T extends string = string> = (colName: T) => number;

export enum RowValidationPolicy {
  NONE = 'NONE',
  NON_EMPTY = 'NON_EMPTY',
  EXACT_MATCH = 'EXACT_MATCH',
}

export type GroupByOptions = {
  cols: string[];
  handler?: (rows: string[][], getColumnIndex: GetColumnIndexType) => string[];
};

export type ColParserFn<T extends string = string> = (
  value: string,
  formattedIndex: number,
  getColumnIndex: GetColumnIndexType<T>,
) => string;

export type RowTransformFn<T extends string = string> = (
  row: string[],
  getColumnIndex: GetColumnIndexType<T>,
) => void;

export type RowValidatorFn<T extends string = string> = (
  row: string[],
  getColumnIndex: GetColumnIndexType<T>,
  rowIndex: number,
  rows: Readonly<string[][]>,
) => boolean;

export type ParserSettingsOptional = {
  temporaryColNames: string[];
  extraCols: ExtraCol[];
  withHeader: boolean;
  csvSeparator: string;
  newLine: string;
  rowValidationPolicy: RowValidationPolicy;
  groupBy: GroupByOptions;
  rowValidator: RowValidatorFn;
  rowTransform: RowTransformFn;
  asArray: boolean;
  rowValuesAsObject: boolean;
  rowValuesAsArray: boolean;
  colFilter: (elText: string[], index: number) => string;
  colParser: ColParserFn;
  optionalColNames: string[];
  reverseTraversal: boolean;
  headerRowsSelector: string | null;
  headerRowsCellSelector: string;
  bodyRowsSelector: string;
  bodyRowsCellSelector: string;
};

export interface ParserSettings extends Partial<ParserSettingsOptional> {
  selector: string;
  readonly allowedColNames: Record<string, string>;
}

export type FullParserSettings = Required<ParserSettings>;

export type ExtraColsMapper = (row: string[], key: keyof ExtraCol) => string[];

export interface MergeParserSettings {
  allowedColNames: FullParserSettings['allowedColNames'];
  extraCols: FullParserSettings['extraCols'];
  temporaryColNames: FullParserSettings['temporaryColNames'];
}

export type OmitOrFalsy<T, K extends keyof T> = Omit<T, K> & {
  [key in K]?: undefined | false;
};
