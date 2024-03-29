enum OperationType {
  FILTER,
  MAP,
  TRANSFORM,
}

type IFilterOperation<T> = {
  type: OperationType.FILTER;
  callback: (item: T, index: number, arr: T[]) => boolean;
};

type IMapOperation<T> = {
  type: OperationType.MAP;
  callback: (item: T, index: number, arr: T[]) => any;
};

type ITransformOperation<T> = {
  type: OperationType.TRANSFORM;
  callback: (item: T, index: number, arr: T[]) => void;
};

type Unwrapped<T> = T extends Array<infer R> ? R : T;

export type IOperation<T> = IFilterOperation<T> | IMapOperation<T> | ITransformOperation<T>;

export class PipelineExecutor<T extends unknown[], R extends unknown[]> {
  private readonly operations: IOperation<any>[] = [];
  constructor(private _input?: Promise<T> | T) {}

  public execute(input?: Promise<T> | T) {
    this._input = input || this._input || ([] as T);

    function isPromise(p: unknown): p is Promise<Awaited<T>> {
      return p && Object.prototype.toString.call(p) === '[object Promise]';
    }

    if (isPromise(this._input)) {
      return this._input.then((x) => this._execute(x));
    } else {
      return this._execute(this._input as Awaited<T>);
    }
  }

  private _execute(input: T): R {
    const acc: unknown[] = [];

    for (let index = 0; index < input.length; index++) {
      let value = input[index];
      let isValid = true;

      for (const { type, callback } of this.operations) {
        if (type === OperationType.FILTER) {
          if (!callback(value, index, acc)) {
            isValid = false;
            break;
          }
        } else if (type === OperationType.MAP) {
          value = callback(value, index, acc);
        } else if (type === OperationType.TRANSFORM) {
          callback(value, index, acc);
        } else {
          throw new Error('Unknown executor operation!');
        }
      }

      if (isValid) {
        acc.push(value);
      }
    }

    return acc as R;
  }

  private addOperation(operation: IOperation<any>) {
    this.operations.push(operation);
    return this;
  }

  public clear() {
    this.operations.length = 0;
    return this;
  }

  public addFilter<L = Unwrapped<T>>(callback: IFilterOperation<L>['callback']) {
    return this.addOperation({
      type: OperationType.FILTER,
      callback,
    });
  }

  public addMap<L = Unwrapped<T>>(callback: IMapOperation<L>['callback']) {
    return this.addOperation({
      type: OperationType.MAP,
      callback,
    });
  }

  public addTransform<L = Unwrapped<T>>(callback: ITransformOperation<L>['callback']) {
    return this.addOperation({
      type: OperationType.TRANSFORM,
      callback,
    });
  }
}
