# 🕸 🕷 puppeteer-table-parser 

Library to make parsing website tables much easier! 
When you are using `puppeteer` for scrapping websites and web application, you will find out that parsing tables consistently is not that easy.
This library brings you abstraction between `puppeteer` and `page context`.

## This library solves the following issues:

- ✨ Parsing columns by their name.
- ✨ Respect the defined order of columns.
- ✨ Appending custom columns with custom data.
- ✨ Custom sanitization of data in cells.
- ✨ Group and Aggregate data by your own function.
- ✨ Merge data from two independent tables into one structure.
- ✨ Handles invalid HTML structure.
- ✨ Retrieve results as CSV or array of plain JS objects.
- ✨ And much more!

## Installation

```shell
yarn add puppeteer-table-parser
```
```shell
npm install puppeteer-table-parser
```

```typescript
// CommonJS
const { tableParser } = require('puppeteer-table-parser')

// ESM / Typescript
import { tableParser } from 'puppeteer-table-parser'
```

## API

```typescript
interface ParserSettings {
  selector: string; // CSS selector
  allowedColNames: Record<string, string>; // key = input name, value = output name)

  headerRowsSelector?: string | null; // (default: 'thead tr', null ignores table's header selection)
  bodyRowsSelector?: string;  // (default: 'tbody tr')
  reverseTraversal?: boolean // (default: false)
  temporaryColNames?: string[]; // (default: []) 
  extraCols?: ExtraCol[]; // (default: [])
  withHeader?: boolean; // (default: true)
  csvSeparator?: string; // (default: ';')
  newLine?: string; // (default: '\n')
  rowValidationPolicy?: RowValidationPolicy; // (default: 'NON_EMPTY')
  groupBy?: {
    cols: string[];
    handler?: (rows: string[][], getColumnIndex: GetColumnIndexType) => string[];
  }
  rowValidator: (
    row: string[],
    getColumnIndex: GetColumnIndexType,
    rowIndex: number,
    rows: Readonly<string[][]>,
  ) => boolean;
  rowTransform?: (row: string[], getColumnIndex: GetColumnIndexType) => void;
  asArray?: boolean; // (default: false)
  rowValuesAsArray?: boolean; // (default: false)
  rowValuesAsObject?: boolean; // (default: false)
  colFilter?: (elText: string[], index: number) => string; // (default: (txt: string) => txt.join(' '))
  colParser?: (value: string, formattedIndex: number, getColumnIndex: GetColumnIndexType) => string; // (default: (txt: string) => txt.trim())
  optionalColNames?: string[]; // (default: [])
};
```

## Parsing workflow

1. Find table(s) by provided CSS selector.
2. Find associated columns by applying `colFilter` on their text and verify their count.
3. Filter rows based on `rowValidationPolicy`
4. Add extra columns specified in `extraCols` property in settings.
5. Run `rowValidator` function for every table row.
6. Run `colParser` for every cell in a row.
7. Run `rowTransform` function for each row.
8. Group results into buckets (`groupBy.cols`) property and pick the aggregated rows.
9. Add processed row to a temp array result. 
10. Add `header` column if `withHeader` property is `true`.
11. Merge partial results and return them.

## Examples

> All data came from the HTML page, which you can find in `test/assets/1.html`.

**Basic example** (the simple table where we want to parse three columns without editing)

```typescript
import { tableParser } from 'puppeteer-table-parser'

await tableParser(page, {
  selector: 'table',
  allowedColNames: {
    'Car Name': 'car',
    'Horse Powers': 'hp',
    'Manufacture Year': 'year',
  },
});
```

```csv
car;hp;year
Audi S5;332;2015
Alfa Romeo Giulia;500;2020
BMW X3;215;2017
Skoda Octavia;120;2012
```

**Basic example** with custom column name parsing:

```typescript
import { tableParser } from 'puppeteer-table-parser'

await tableParser(page, {
  selector: 'table',
  colFilter: (value: string[]) => {
    return value.join(' ').replace(' ', '-').toLowerCase();
  },
  colParser: (value: string) => {
    return value.trim();
  },
  allowedColNames: {
    'car-name': 'car',
    'horse-powers': 'hp',
    'manufacture-year': 'year',
  },
})
```

```csv
car;hp;year
Audi S5;332;2015
Alfa Romeo Giulia;500;2020
BMW X3;215;2017
Skoda Octavia;120;2012
```

**Basic example** with row validation and using temporary column.

```typescript
import { tableParser } from 'puppeteer-table-parser'

await tableParser(page, {
  selector: 'table',
  allowedColNames: {
    'Car Name': 'car',
    'Manufacture Year': 'year',
    'Horse Powers': 'hp',
  },
  temporaryColNames: ['Horse Powers'],
  rowValidator: (row: string[], getColumnIndex) => {
    const powerIndex = getColumnIndex('hp');
    return Number(row[powerIndex]) < 250;
  },
});
```

```csv
car;year
BMW X3;2017
Skoda Octavia;2012
```

**Advanced example:**

Uses custom temporary column for filtering. It uses an extra column with custom 
position to be filled on a fly.

```typescript
import { tableParser } from 'puppeteer-table-parser'

await tableParser(page, {
  selector: 'table',
  allowedColNames: {
    'Manufacture Year': 'year',
    'Horse Powers': 'hp',
    'Car Name': 'car',
  },
  temporaryColNames: ['Horse Powers'],
  extraCols: [
    {
      colName: 'favorite',
      data: '',
      position: 0,
    },
  ],
  rowValidator: (row: string[], getColumnIndex) => {
    const horsePowerIndex = getColumnIndex('hp');
    return Number(row[horsePowerIndex]) > 150;
  },
  rowTransform: (row: string[], getColumnIndex) => {
    const nameIndex = getColumnIndex('car');
    const favoriteIndex = getColumnIndex('favorite');

    if (row[nameIndex].includes('Alfa Romeo')) {
      row[favoriteIndex] = 'YES';
    } else {
      row[favoriteIndex] = 'NO';
    }
  },
  asArray: false,
  rowValuesAsArray: false
});
```

```csv
favorite;year;car
NO;2015;Audi S5
YES;2020;Alfa Romeo Giulia
NO;2017;BMW X3
```

**Optional columns**

Sometimes you can be in a situation where some if
your columns are desired, but they are not available in a table.
You can easily add an exception for them via `optionalColNames` property.

```typescript
import { tableParser } from 'puppeteer-table-parser'

await tableParser(page, {
  selector: 'table',
  allowedColNames: {
    'Car Name': 'car',
    'Rating': 'rating',
  },
  optionalColNames: ['rating']
});
```

**Grouping and Aggregating**
```typescript
import { tableParser } from 'puppeteer-table-parser'

await tableParser(page, {
  selector: '#my-table',
  allowedColNames: {
    'Employee Name': 'name',
    'Age': 'age',
  },
  groupBy: {
    cols: ['name'],
    handler: (rows: string[][], getColumnIndex) => {
      const ageIndex = getColumnIndex('age');

      // select one with the minimal age
      return rows.reduce((previous, current) =>
        previous[ageIndex] < current[ageIndex] ? previous : current,
      );
    },
  }
});
```

For more, look at the `test` folder! 🙈

