# 🕸 🕷 puppeteer-table-parser 

Library to make parsing website tables much easier! 
When you are using `puppeteer` for scrapping websites and web application, you will find out that parsing tables consistently is not that easy.
This library brings you abstraction between `puppeteer` and `page context`.

## This library solves the following issues:

- ✨ Parsing columns by their name.
- ✨ Respect the defined order of columns.
- ✨ Appending custom columns with custom data.
- ✨ Custom sanitization of data in cells.
- ✨ Merge data from two independent tables into one structure.
- ✨ Handles invalid HTML structure
- ✨ And much more!

## Installation

```
yarn add puppeteer-table-parser
```
```
npm install puppeteer-table-parser
```

## Examples

> All data came from the HTML page, which you can find in `test/assets/1.html`.

**Basic example** (the simple table where we want to parse three columns without editing)

```typescript
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
```

**Basic example** with custom column name parsing:

```typescript
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
```

**Basic example** with row validation and using temporary column.

```typescript
await tableParser(page, {
  selector: 'table',
  allowedColNames: {
    'Car Name': 'car',
    'Manufacture Year': 'year',
    'Horse Powers': 'hp',
  },
  temporaryColNames: ['Horse Powers'],
  rowValidator: (row: string[], getColumnIndex: (colName: string) => number) => {
    const powerIndex = getColumnIndex('hp');

    return Number(row[powerIndex]) < 250;
  },
});
```

```csv
car;year
BMW X3;2017
```

**Advanced example:**

Uses custom temporary column for filtering. It uses an extra column with custom 
position to be filled on a fly.

```typescript
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
      data: '', // we will edit the data on fly
      position: 0,
    },
  ],
  rowValidator: (row: string[], getColumnIndex) => {
    const favoriteIndex = getColumnIndex('favorite');
    const horsePowerIndex = getColumnIndex('hp');
    const nameIndex = getColumnIndex('car');

    if (row[nameIndex].includes('Alfa Romeo') || Number(row[horsePowerIndex]) > 300) {
      row[favoriteIndex] = 'YES';
    } else {
      row[favoriteIndex] = 'NO';
    }

    return true;
  },
});
```

```csv
favorite;year;car
NO;2015;Audi S5
YES;2020;Alfa Romeo Giulia
```

For more, look at `test` folder! 🙈

## TODO

- [X] Add more examples
- [X] Add tests
- [ ] Show merging table structures
- [ ] Describe interfaces
