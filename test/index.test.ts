import { Server } from 'http';
import { promisify } from 'util';
import { createServer, getBaseUrl } from './createServer';
import { Browser, launch, Page } from 'puppeteer';
import { tableParser, RowValidationPolicy } from '../src';

describe('Basic parsing', () => {
  let server: Server;
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    server = await createServer();
    browser = await launch({
      headless: true,
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
    await promisify(server.close).bind(server)();
  });

  it('Parse no filters', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "car;hp;year
      Audi S5;332;2015
      Alfa Romeo Giulia;500;2020
      BMW X3;215;2017
      Skoda Octavia;120;2012"
    `);
  });

  it('Parse in reverse order', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      reverseTraversal: true,
      allowedColNames: {
        'Car Name': 'car',
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "car
      Skoda Octavia
      BMW X3
      Alfa Romeo Giulia
      Audi S5"
    `);
  });

  it('Return data as array with strings inside', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data: string[] = await tableParser(page, {
      asArray: true,
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
    });

    expect(data).toMatchInlineSnapshot(`
      [
        "car;hp;year",
        "Audi S5;332;2015",
        "Alfa Romeo Giulia;500;2020",
        "BMW X3;215;2017",
        "Skoda Octavia;120;2012",
      ]
    `);
  });

  it('Return data as array with arrays inside', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data: string[][] = await tableParser(page, {
      asArray: true,
      rowValuesAsArray: true,
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
    });

    expect(data).toMatchInlineSnapshot(`
      [
        [
          "car",
          "hp",
          "year",
        ],
        [
          "Audi S5",
          "332",
          "2015",
        ],
        [
          "Alfa Romeo Giulia",
          "500",
          "2020",
        ],
        [
          "BMW X3",
          "215",
          "2017",
        ],
        [
          "Skoda Octavia",
          "120",
          "2012",
        ],
        [
          "",
        ],
      ]
    `);
  });

  it('Throw error with invalid options', async () => {
    await expect(
      tableParser(page, {
        selector: 'table',
        asArray: false,
        // @ts-expect-error intended
        rowValuesAsArray: true,
        allowedColNames: {
          'car-name': 'car',
        },
      }),
    ).rejects.toThrowError();

    await expect(
      tableParser(page, {
        selector: 'table',
        // @ts-expect-error intended
        rowValuesAsObject: true,
        // @ts-expect-error intended
        rowValuesAsArray: true,
        allowedColNames: {
          'car-name': 'car',
        },
      }),
    ).rejects.toThrowError();

    await expect(
      tableParser(page, {
        selector: 'table',
        rowValuesAsObject: false,
        // @ts-expect-error intended
        rowValuesAsArray: true,
        allowedColNames: {
          'car-name': 'car',
        },
      }),
    ).rejects.toThrowError();
  });

  it('Throw error when specified optional column which does not exists', async () => {
    await expect(
      tableParser(page, {
        selector: 'table',
        allowedColNames: {
          'car-name': 'car',
        },
        optionalColNames: ['xcar'],
      }),
    ).rejects.toThrowError();
  });

  it('Parse webalize', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
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
    });

    expect(data).toMatchInlineSnapshot(`
      "car;hp;year
      Audi S5;332;2015
      Alfa Romeo Giulia;500;2020
      BMW X3;215;2017
      Skoda Octavia;120;2012"
    `);
  });

  it('Parse and preserver order', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      allowedColNames: {
        'Manufacture Year': 'year', // is last normally
        'Car Name': 'car',
        'Horse Powers': 'hp',
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "year;car;hp
      2015;Audi S5;332
      2020;Alfa Romeo Giulia;500
      2017;BMW X3;215
      2012;Skoda Octavia;120"
    `);
  });

  it('Apply filter to rows', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
      rowValidator: (row: string[], getColumnIndex) => {
        const indexByVal = getColumnIndex('year');
        const indexByKey = getColumnIndex('Manufacture Year');

        expect(indexByVal).toStrictEqual(indexByKey);

        return Number(row[indexByVal]) >= 2018;
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "car;hp;year
      Alfa Romeo Giulia;500;2020"
    `);
  });

  it('Use temporary columns', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
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

    expect(data).toMatchInlineSnapshot(`
      "car;year
      BMW X3;2017
      Skoda Octavia;2012"
    `);
  });

  it('Use extra columns', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
      },
      extraCols: [
        {
          colName: 'date',
          data: '2021-03-15',
          position: 0,
        },
      ],
    });

    expect(data).toMatchInlineSnapshot(`
      "date;car
      2021-03-15;Audi S5
      2021-03-15;Alfa Romeo Giulia
      2021-03-15;BMW X3
      2021-03-15;Skoda Octavia
      2021-03-15;"
    `);
  });

  it('Use dynamic extra columns', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
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
    });

    expect(data).toMatchInlineSnapshot(`
      "favorite;year;car
      NO;2015;Audi S5
      YES;2020;Alfa Romeo Giulia
      NO;2017;BMW X3"
    `);
  });

  it('Parse if column was not found, but was optional', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      rowValidationPolicy: RowValidationPolicy.EXACT_MATCH,
      allowedColNames: {
        'Car Name': 'car',
        'Some non existing column': 'non-existing',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
      extraCols: [
        {
          colName: 'ex',
          data: 'ex',
          position: 1,
        },
      ],
      optionalColNames: ['car', 'non-existing'],
    });

    expect(data).toMatchInlineSnapshot(`
      "car;ex;hp;year
      Audi S5;ex;332;2015
      Alfa Romeo Giulia;ex;500;2020
      BMW X3;ex;215;2017
      Skoda Octavia;ex;120;2012"
    `);
  });

  it('Handles multiple extra columns', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
      },
      extraCols: [
        {
          colName: 'ex1',
          data: 'ex1',
        },
        {
          colName: 'ex2',
          data: 'ex2',
        },
      ],
    });

    expect(data).toMatchInlineSnapshot(`
      "car;hp;ex1;ex2
      Audi S5;332;ex1;ex2
      Alfa Romeo Giulia;500;ex1;ex2
      BMW X3;215;ex1;ex2
      Skoda Octavia;120;ex1;ex2
      ;ex1;ex2"
    `);
  });

  it('Handles filtering partial rows', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      rowValidationPolicy: RowValidationPolicy.EXACT_MATCH,
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
      extraCols: [
        {
          colName: 'sellerId',
          data: '123',
        },
      ],
    });

    expect(data).toMatchInlineSnapshot(`
      "car;hp;year;sellerId
      Audi S5;332;2015;123
      Alfa Romeo Giulia;500;2020;123
      BMW X3;215;2017;123
      Skoda Octavia;120;2012;123"
    `);
  });

  it('Handles aggregation', async () => {
    await page.goto(`${getBaseUrl()}/2.html`);

    const data = await tableParser(page, {
      selector: '#employee-overview',
      asArray: false,
      allowedColNames: {
        'Employee Name': 'name',
        'Age': 'age',
      },
      groupBy: {
        cols: ['name'],
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "name;age
      John M. Bolduc;32
      Allan Meron;40
      Milan Lukeš;33"
    `);
  });

  it('Handles aggregation with custom handler', async () => {
    await page.goto(`${getBaseUrl()}/2.html`);

    const data = await tableParser(page, {
      selector: '#employee-overview',
      asArray: false,
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
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "name;age
      John M. Bolduc;29
      Allan Meron;40
      Milan Lukeš;33"
    `);
  });

  it('Parses a large HTML table', async () => {
    await page.goto(`${getBaseUrl()}/large-table.html`);

    const data = await tableParser(page, {
      selector: 'table',
      asArray: false,
      allowedColNames: {
        A: 'first',
        B: 'second',
      },
    });

    expect(data).toBeTruthy();
  });

  it('Returns data as a object', async () => {
    await page.goto(`${getBaseUrl()}/2.html`);

    const data = await tableParser(page, {
      selector: '#employee-overview',
      rowValuesAsObject: true,
      asArray: true,
      allowedColNames: {
        'Employee Name': 'name',
        'Age': 'age',
      },
    });

    expect(data).toBeInstanceOf(Array);
    data.forEach((row) => {
      expect(row).toHaveProperty('age');
      expect(row).toHaveProperty('name');
    });
  });

  it('Returns only header because no rows passed filter', async () => {
    await page.goto(`${getBaseUrl()}/2.html`);

    const data = await tableParser(page, {
      selector: '#employee-overview',
      rowValidator: () => false,
      asArray: true,
      csvSeparator: ',',
      allowedColNames: {
        'Employee Name': 'name',
        'Age': 'age',
      },
    });

    expect(data).toBeInstanceOf(Array);
    expect(data.length).toBe(1);
    expect(data[0]).toBe('name,age');
  });

  it('Handles non-text elements', async () => {
    await page.goto(`${getBaseUrl()}/3.html`);

    const data = await tableParser(page, {
      selector: '#table-overview',
      asArray: false,
      allowedColNames: {
        'A': 'A',
        '': 'B',
        'C': 'C',
      },
      colParser: (value, x) => {
        console.info({ value, x });
        return value.trim();
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "A;B;C
      A1;B1;C1
      A1;;C1"
    `);
  });

  it('Exclude columns', async () => {
    await page.goto(`${getBaseUrl()}/1.html`);

    const data = await tableParser(page, {
      selector: 'table',
      allowedColNames: {
        'Car Name': 'car',
        'Horse Powers': 'hp',
        'Manufacture Year': 'year',
      },
      optionalColNames: ['year'],
      rowValidationPolicy: RowValidationPolicy.EXACT_MATCH,
      colParser: (value) => value.trim(),
      excludedColumns: (rows, getColumnIndex) => {
        expect(rows.length).toBe(4);
        expect(getColumnIndex('car')).toBe(0);
        expect(getColumnIndex('hp')).toBe(1);
        expect(getColumnIndex('year')).toBe(2);
        return ['year'];
      },
    });

    expect(data).toMatchInlineSnapshot(`
      "car;hp
      Audi S5;332
      Alfa Romeo Giulia;500
      BMW X3;215
      Skoda Octavia;120"`);
  });
});
