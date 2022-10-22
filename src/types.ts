export interface ExtraCol {
  colName: string;
  data: string;
  position?: number;
}

export type GetColumnIndexType = (colName: string) => number;

export enum RowValidationPolicy {
  NONE = 'NONE',
  NON_EMPTY = 'NON_EMPTY',
  EXACT_MATCH = 'EXACT_MATCH',
}

export type GroupByOptions = {
  cols: string[];
  handler?: (rows: string[][], getColumnIndex: GetColumnIndexType) => string[];
};

export type ParserSettingsOptional = {
  temporaryColNames: string[];
  extraCols: ExtraCol[];
  withHeader: boolean;
  csvSeparator: string;
  newLine: string;
  rowValidationPolicy: RowValidationPolicy;
  groupBy: GroupByOptions;
  rowValidator: (
    row: string[],
    getColumnIndex: GetColumnIndexType,
    rowIndex: number,
    rows: Readonly<string[][]>,
  ) => boolean;
  rowTransform: (row: string[], getColumnIndex: GetColumnIndexType) => void;
  asArray: boolean;
  rowValuesAsObject: boolean;
  rowValuesAsArray: boolean;
  colFilter: (elText: string[], index: number) => string;
  colParser: (value: string, formattedIndex: number, getColumnIndex: GetColumnIndexType) => string;
  optionalColNames: string[];
  reverseTraversal: boolean;
  headerRowsSelector: string | null;
  bodyRowsSelector: string;
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
