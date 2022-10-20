import { MergeParserSettings } from '../src/types';
import { mergeParserSettings } from '../src/merger';

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
      {
        "allowedColNames": {
          "manufacture-year": "year",
        },
        "extraCols": [
          {
            "colName": "car",
            "data": "",
            "position": 0,
          },
          {
            "colName": "hp",
            "data": "",
            "position": 1,
          },
        ],
        "temporaryColNames": [],
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
      {
        "allowedColNames": {
          "car-name": "car",
        },
        "extraCols": [
          {
            "colName": "year",
            "data": "2021",
          },
        ],
        "temporaryColNames": [],
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
      {
        "allowedColNames": {
          "car-name": "car",
          "horse-powers-hp": "hp",
        },
        "extraCols": [],
        "temporaryColNames": [],
      }
    `);
  });
});
