import { IContainer } from "./Container.ts";
import { FunctionFactory } from "./Factory.ts";
import Registrar from "./Metadata/Registrar.ts";
import { Constructor, ServiceIdentifier } from "./Types.ts";

import { defaultConfig, SCOPES, ServiceConfig } from "./Decorators.ts";

export type { IFactory, IAsyncFactory } from "./IFactory.ts";

export {
  Service,
  Inject,
  InjectAll,
  Factory,
  Parameter,
} from "./Decorators.ts";

export type { IContainer } from "./Container.ts";

export async function getContainer(): Promise<IContainer> {
  return await Registrar.build();
}

export async function refreshContainer(): Promise<IContainer> {
  return await Registrar.build(true);
}

export async function setParameter(
  key: string | symbol | Constructor,
  value: any
) {
  Registrar.setParameter(key, value);
}

type anonymousFactory = ((args: any[]) => Object) | Object;
type asyncAnonymousFactory =
  | ((args: any[]) => Object | Promise<Object>)
  | Object
  | Promise<Object>;

export async function register(
  identifier: ServiceIdentifier,
  factory: anonymousFactory,
  config: Partial<ServiceConfig> = {}
) {
  const maker = typeof factory === "function" ? factory : () => factory;
  const fnFactory = new FunctionFactory(maker as () => Object);
  Registrar.registerFactory(fnFactory, Symbol(identifier.toString()), {
    ...defaultConfig(identifier),
    ...config,
  });
}

export async function registerAsync(
  identifier: ServiceIdentifier,
  factory: asyncAnonymousFactory,
  config: Partial<ServiceConfig> = {}
) {
  const maker = typeof factory === "function" ? factory : () => factory;
  const finalConfig = { ...defaultConfig(identifier), ...config };
  const fnFactory = new FunctionFactory(maker as () => Object);
  if (finalConfig.scoping !== SCOPES.singleton) {
    throw new Error(
      "Dynamically registered async factories must be registered as singletons"
    );
  }
  Registrar.registerFactory(
    fnFactory,
    Symbol(identifier.toString()),
    finalConfig
  );
}
