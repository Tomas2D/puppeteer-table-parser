export class GeneralError extends Error {}

export class NoTablesFoundError extends GeneralError {}

export class InvalidSettingsError extends GeneralError {}

export class MissingRequiredColumnsError extends GeneralError {}

export class InvalidColumnError extends GeneralError {}
