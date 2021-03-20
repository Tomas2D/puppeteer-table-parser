import { MergeParserSettings } from '../src/types';
import mergeParserSettings from '../src/merger';

describe('Basic parsing', () => {
  it('Merge allowedColNames', () => {
    const configExample: MergeParserSettings = {
      allowedColNames: {
        'car-name': 'car',
        'horse-powers': 'hp',
      },
      extraCols: [],
      temporaryColNames: [],
    };

    const configPartial: MergeParserSettings = {
      allowedColNames: {
        'manufacture-year': 'year',
      },
      extraCols: [],
      temporaryColNames: [],
    };

    const merged = mergeParserSettings(configPartial, configExample);
    expect(merged).toMatchInlineSnapshot(`
      Object {
        "allowedColNames": Object {
          "manufacture-year": "year",
        },
        "extraCols": Array [
          Object {
            "colName": "car",
            "data": "",
            "position": 0,
          },
          Object {
            "colName": "hp",
            "data": "",
            "position": 1,
          },
        ],
        "temporaryColNames": Array [],
      }
    `);
  });

  it('Merge extraCols', () => {
    const configExample: MergeParserSettings = {
      allowedColNames: {
        'car-name': 'car',
      },
      extraCols: [
        {
          colName: 'year',
          data: '2021',
        },
      ],
      temporaryColNames: [],
    };

    const configPartial: MergeParserSettings = {
      allowedColNames: {
        'car-name': 'car',
      },
      extraCols: [],
      temporaryColNames: [],
    };

    const merged = mergeParserSettings(configPartial, configExample);
    expect(merged).toMatchInlineSnapshot(`
      Object {
        "allowedColNames": Object {
          "car-name": "car",
        },
        "extraCols": Array [
          Object {
            "colName": "year",
            "data": "2021",
          },
        ],
        "temporaryColNames": Array [],
      }
    `);
  });

  it('ignores appending column if it exists in ignoredAllowedColumns', () => {
    const configExample: MergeParserSettings = {
      allowedColNames: {
        'car-name': 'car',
        'horse-powers': 'hp',
      },
      extraCols: [],
      temporaryColNames: [],
    };

    const configPartial: MergeParserSettings = {
      allowedColNames: {
        'car-name': 'car',
        'horse-powers-hp': 'hp',
      },
      extraCols: [],
      temporaryColNames: [],
    };

    const merged = mergeParserSettings(configPartial, configExample, ['horse-powers']);
    expect(merged).toMatchInlineSnapshot(`
      Object {
        "allowedColNames": Object {
          "car-name": "car",
          "horse-powers-hp": "hp",
        },
        "extraCols": Array [],
        "temporaryColNames": Array [],
      }
    `);
  });
});
