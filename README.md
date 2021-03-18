# 🕸 🕷 puppeteer-table-parser 

Library for make parsing website tables much more easy!
When you are using for `puppeteer` for scrapping websites and web 
application you will find out, that parsing tables consistently is not that easy. This library brings you abstraction between 
`puppeter` and `page` context.

##This library solves following issues:

- ✨ Parsing columns by their name.
- ✨ Keeps ordering of columns.
- ✨ Appending custom columns with custom data.
- ✨ Custom sanitization of data in cells.
- ✨ Merge data from two independent tables into one structure.
- ✨ Returns output as array of rows or as CSV string.
- ✨ And much more!

## How to use it?

Basic example:

```typescript
return await tableParser(page, {
    selector: 'table#cars-overview',
    withHeader: true,
    colFilter: (value: string[], index: number) => {
      // parameter `value` is splitted by new lines if <br> occurs
      return value.join(' ').replace(' ', '-').toLowerCase()
    },
    colParser: (value: string, formattedIndex: number) => {
      return value.trim();
    },
    allowedColNames: {
      // Left = sanitized name from `colFilter`
      // Right = name in header
      'car-name': 'car',
      'car-engine': 'engine',
      'horse-powers': 'hp',
      'manufacture-year': 'year',
    },
    extraCols: [
      {
        colName: 'page',
        data: 'example.com',
        position: 1, // optional, zero indexed
      },
    ],
});
```

## TODO

- [ ] Add more examples
- [ ] Add tests
- [ ] Show merging table structures
- [ ] Describe interfaces
