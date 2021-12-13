import { Server } from 'http';
import { promisify } from 'util';
import { createServer, getBaseUrl } from './createServer';
import { launch, Browser, Page } from 'puppeteer';
import tableParser from '../src';

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
    await promisify(server.close).bind(server)();
    await browser.close();
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
      Array [
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
      Array [
        Array [
          "car",
          "hp",
          "year",
        ],
        Array [
          "Audi S5",
          "332",
          "2015",
        ],
        Array [
          "Alfa Romeo Giulia",
          "500",
          "2020",
        ],
        Array [
          "BMW X3",
          "215",
          "2017",
        ],
        Array [
          "Skoda Octavia",
          "120",
          "2012",
        ],
      ]
    `);
  });

  it('Throw error with invalid options', () => {
    expect(
      tableParser(page, {
        selector: 'table',
        asArray: false,
        rowValuesAsArray: true,
        allowedColNames: {
          'car-name': 'car',
        },
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
      2021-03-15;Skoda Octavia"
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
});
