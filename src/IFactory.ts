export type NoPromise<T> = T extends PromiseLike<any> ? never : T;
export interface IFactory<R> {
  resolve(data?: any[]): NoPromise<R>;
}

export interface IAsyncFactory<R> {
  resolve(data?: any[]): Promise<R>;
}
