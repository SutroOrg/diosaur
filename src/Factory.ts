import { IFactory, IAsyncFactory, NoPromise } from "./IFactory.ts";
import { Constructor } from "./Types.ts";

export class BasicFactory<R> implements IFactory<R> {
  constructor(private targetType: Constructor) {}

  resolve(data: any[]): any {
    return Reflect.construct(this.targetType, data);
  }
}

export class FunctionFactory<R> implements IFactory<R> {
  constructor(private serviceMaker: (args: any[]) => NoPromise<R>) {}

  resolve(data: any[]): NoPromise<R> {
    return this.serviceMaker(data);
  }
}

export class AsyncFunctionFactory<R> implements IAsyncFactory<R> {
  constructor(private serviceMaker: (args: any[]) => Promise<R>) {}

  async resolve(data: any): Promise<R> {
    return await this.serviceMaker(data);
  }
}
