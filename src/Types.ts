export type AnyObject = {
  [index: PropertyKey]: unknown;
};

export type Constructor<O extends any = any> = { new (...args: any[]): O };

export type ServiceIdentifier<O extends any = any> =
  | string
  | symbol
  | Constructor<O>;

export type ServiceClassIdentifier = string | symbol | Constructor;

export type ServiceRegistry = Map<
  ServiceIdentifier,
  Map<string | null, Object>
>;

export type ParameterBag = Map<ServiceIdentifier, any>;
