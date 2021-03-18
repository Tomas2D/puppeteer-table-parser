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
  rowValidator: (row: string[]) => boolean;
  asArray: boolean;
}

export interface ParserSettings extends Partial<ParserSettingsOptional> {
  selector: string;
  colFilter: (elText: string[], index: number) => string;
  colParser: (value: string, formattedIndex: number) => string;
  allowedColNames: Record<string, string>;
}

export type FullParserSettings = Required<ParserSettings>;

export type ExtraColsMapper = (row: string[], key: keyof ExtraCol) => string[];
