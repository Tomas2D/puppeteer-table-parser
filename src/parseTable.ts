import { FullParserSettings, RowValidationPolicy } from './types';
import { extraColsMapperFactory, getColumnsInfo } from './helpers';
import { ElementHandle } from 'puppeteer';
import { InvalidSettingsError } from './errors';
import { PipelineExecutor } from './pipelineExecutor';
import { groupBy } from './aggregations';
import * as mappers from './mappers';

export function parseTableFactory(settings: FullParserSettings) {
  const extraColsMapper = extraColsMapperFactory(settings.extraCols);

  const findHeaderRow = async (
    table: ElementHandle,
  ): Promise<{ el: ElementHandle; bodyRowsOffset: number } | null> => {
    const headerRow = settings.headerRowsSelector
      ? await table.$(settings.headerRowsSelector)
      : null;

    if (headerRow) {
      return {
        bodyRowsOffset: 0,
        el: headerRow,
      };
    }

    const bodyRow = await table.$(settings.bodyRowsSelector);
    if (bodyRow) {
      return {
        bodyRowsOffset: 1,
        el: bodyRow,
      };
    }

    return null;
  };

  const getOutputHeaderRow = (missingColNames: string[]) => {
    const headerRowRaw = Object.values(settings.allowedColNames);
    const sortedHeader = extraColsMapper(headerRowRaw, 'colName');

    return sortedHeader.filter((key) => !missingColNames.includes(key));
  };

  const getRowStructureValidator = (allowedIndexes: Record<string, number>) => {
    if (settings.rowValidationPolicy === RowValidationPolicy.NONE) {
      return () => true;
    }
    if (settings.rowValidationPolicy === RowValidationPolicy.NON_EMPTY) {
      return (rows: string[]) => rows.length > 0;
    }
    if (settings.rowValidationPolicy === RowValidationPolicy.EXACT_MATCH) {
      return (rows: string[]) => rows.length === Object.keys(allowedIndexes).length;
    }
    throw new InvalidSettingsError('Unknown mode for the "rowValidationPolicy"');
  };

  const getRowsData = async (
    table: ElementHandle,
    rowsOffset: number,
    allowedIndexes: Record<number, number>,
  ): Promise<string[][]> => {
    return await table.evaluate(
      (
        el,
        { reverseTraversal, allowedIndexes, bodyRowsSelector, rowsOffset, bodyRowsCellSelector },
      ) => {
        const rows = Array.from(el.querySelectorAll(bodyRowsSelector));
        rows.splice(0, rowsOffset);
        if (reverseTraversal) {
          rows.reverse();
        }

        const allowedIndexesMap = new Map(
          Object.entries(allowedIndexes).map(([k, v]) => [Number(k), v]),
        );
        return rows.map((row) =>
          Array.from(row.querySelectorAll(bodyRowsCellSelector))
            .map((cell, realIndex): [Element, number] => [cell, realIndex])
            .filter((_, realIndex) => allowedIndexesMap.has(realIndex))
            .sort((a, b) => {
              const indexA = allowedIndexesMap.get(a[1]);
              const indexB = allowedIndexesMap.get(b[1]);

              return indexA - indexB;
            })
            .map(([cell]): string => (cell as HTMLElement)?.innerText ?? cell?.textContent),
        );
      },
      {
        reverseTraversal: settings.reverseTraversal,
        bodyRowsSelector: settings.bodyRowsSelector,
        bodyRowsCellSelector: settings.bodyRowsCellSelector,
        allowedIndexes,
        rowsOffset,
      },
    );
  };

  return async (table: ElementHandle, addHeader: boolean) => {
    await table.evaluate((el) => el.scrollIntoView());

    const header = await findHeaderRow(table);
    if (!header) {
      return [];
    }

    const { indexes, getColumnIndex, missingColNames, updateExcludedColumns, getOutputColumnKeys } =
      await getColumnsInfo(settings, header.el, extraColsMapper);

    let parsedRows = await new PipelineExecutor<string[][], string[][]>(
      await getRowsData(table, header.bodyRowsOffset, indexes.allowed),
    )
      .addFilter(getRowStructureValidator(indexes.allowed))
      .addMap((row) => extraColsMapper(row, 'data'))
      .addFilter((row, index, rows) => settings.rowValidator(row, getColumnIndex, index, rows))
      .addMap((row) => row.map((cell, index) => settings.colParser(cell, index, getColumnIndex)))
      .addTransform((row) => settings.rowTransform(row, getColumnIndex))
      .execute();

    if (settings.groupBy) {
      parsedRows = groupBy(parsedRows, settings.groupBy, getColumnIndex);
    }

    if (settings.excludedColumns) {
      const excludedColNames = settings.excludedColumns(parsedRows, getColumnIndex) ?? [];
      updateExcludedColumns(excludedColNames);
    }

    if (addHeader) {
      const headerRow = getOutputHeaderRow(missingColNames);
      parsedRows.unshift(headerRow);
    }

    const rowOutputMapper = settings.rowValuesAsObject
      ? mappers.asObject(
          (() => {
            const outputColumnKeys = getOutputColumnKeys();
            return (index) => outputColumnKeys[index];
          })(),
        )
      : settings.rowValuesAsArray
      ? mappers.asArray()
      : mappers.asCsv(settings.csvSeparator);

    return new PipelineExecutor<string[][], ReturnType<typeof rowOutputMapper>[]>(parsedRows)
      .addMap((row) => row.filter((_, index) => !indexes.excluded.includes(index)))
      .addMap(rowOutputMapper)
      .execute();
  };
}
