export interface ExtraCol {
  colName: string;
  data: string;
  position?: number;
}

export interface ParserSettingsOptional {
  temporaryColNames: string[];
  extraCols: ExtraCol[];
  withHeader: boolean;
  csvSeparator: string;
  newLine: string;
  rowValidator: (row: string[], getColumnIndex: (colName: string) => number) => boolean;
  asArray: boolean;
  colFilter: (elText: string[], index: number) => string;
  colParser: (value: string, formattedIndex: number) => string;
}

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
