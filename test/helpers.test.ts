import { omitUndefined } from '../src/helpers';
import type { ParserSettingsOptional } from '../src/types';

describe('Helper utils', () => {
  it('Removes undefined properties', () => {
    const settings: Partial<ParserSettingsOptional> = {
      temporaryColNames: [],
      asArray: true,
      colFilter: undefined,
    };

    expect(omitUndefined(settings)).toMatchInlineSnapshot(`
      {
        "asArray": true,
        "temporaryColNames": [],
      }
    `);
  });
});
