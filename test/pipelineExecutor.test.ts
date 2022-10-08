import PipelineExecutor from '../src/pipelineExecutor';

describe('PipelineExecutor class', () => {
  it('Empty case', () => {
    const executor = new PipelineExecutor();
    expect(executor.execute([])).toStrictEqual([]);
  });

  it('Clear works', () => {
    const executor = new PipelineExecutor<number[], number[]>().addMap((r) => r + 1);
    expect(executor.execute([1])).toStrictEqual([2]);
    executor.clear();
    expect(executor.execute([1])).toStrictEqual([1]);
  });

  it('Correctly handle simples map', () => {
    const executor = new PipelineExecutor<number[], number[]>()
      .addMap((r) => r + 2)
      .addMap((r) => r * 2);

    expect(executor.execute([2, 2, 2])).toStrictEqual([8, 8, 8]);
  });

  it('Correctly handle simple filter operation', () => {
    const executor = new PipelineExecutor().addFilter((r) => r >= 5).addFilter((r) => r >= 10);

    expect(executor.execute([2, 5, 10])).toStrictEqual([10]);
  });

  it('Complex queries', () => {
    const input = [
      ['10', 'a', 'b'],
      [],
      ['11', 'c', 'd'],
      ['12', 'e', 'd'],
      ['13', 'a', 'c'],
      ['14', 'a', 'c'],
    ];

    const executor = new PipelineExecutor<string[][], string[]>();
    executor.addFilter((row) => row.length > 0);
    executor.addMap((row) => row.join(';'));
    executor.addFilter((row) => row.includes('a'));
    expect(executor.execute(input)).toMatchInlineSnapshot(`
      Array [
        "10;a;b",
        "13;a;c",
        "14;a;c",
      ]
    `);
  });
});
