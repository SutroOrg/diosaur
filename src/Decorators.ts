import {
  IncorrectFactoryError,
  InjectAsParameterError,
  NotInConstructorError,
} from "./Errors.ts";
import { IFactory } from "./IFactory.ts";
import Registrar from "./Metadata/Registrar.ts";
import { Constructor, ServiceIdentifier } from "./Types.ts";

/** Service */

export enum SCOPE {
  singleton = "singleton",
  renewable = "renewable",
  custom = "custom",
}

export interface ServiceConfig {
  identifier: ServiceIdentifier;
  tag: string | null;
  scoping: SCOPE;
  customScopes: string[];
}

export const defaultConfig = (
  identifier: ServiceIdentifier
): ServiceConfig => ({
  identifier,
  tag: null,
  scoping: SCOPE.singleton,
  customScopes: [],
});

/**
 * The @Service decorator indicates that something is a service. Normally, this will be a class, but, in theory, it could be anything
 *
 * @param config.identifier An optional service identifier can be provided. This is useful when you want multiple implementations for a give interface (for instance)
 * @param config.tag An optional tag; mostly used for differentiating implementations of the same interface
 * @param config.scoping See {@link ../docs/scopes.md|Scopes} for more details
 * @param config.customScopes See {@link ../docs/scopes.md|Scopes} for more details
 */
export function Service(config: Partial<ServiceConfig> = {}) {
  return <T extends Constructor>(target: T) => {
    const finalConfig = {
      ...defaultConfig(target),
      ...config,
    };
    Registrar.registerService(target, finalConfig);
  };
}

/** Factory */
export function Factory(
  createdService: ServiceIdentifier,
  config: Partial<ServiceConfig> = {}
) {
  return <T extends Constructor<IFactory<unknown>>>(factoryConstructor: T) => {
    const factory = new factoryConstructor();
    if (!("resolve" in factory)) {
      throw new IncorrectFactoryError(factoryConstructor);
    }

    const isPromise = false;
    if (config.scoping && config.scoping !== SCOPE.singleton && isPromise) {
      throw new Error("Async factories MUST be scoped as singletons");
    }

    Registrar.registerFactory(factory, createdService, {
      ...defaultConfig(createdService),
      ...config,
    });
  };
}

export interface InjectConfig {
  tag: string | null;
  identifier: ServiceIdentifier;
  refresh: boolean;
}

interface InjectOptions {
  identifier: ServiceIdentifier;
  tag?: string | null;
  refresh?: boolean;
}

/**
 * The @Inject decorator indicates that a class property or function parameter should be populated from the DI container
 *
 *
 * @param injectOptions.identifier - A valid service identifier for this service. For a class, the class itself will suffice
 * @param injectOptions.tag - An optional tag for the service; this is useful for differentiating different implementations of a service interface
 * @param injectOptions.refresh - If set to true, this makes sure that the injected instance is refreshed every time
 */
export function Inject(injectOptions: InjectOptions) {
  return (target: any, key: string | symbol, index?: number) => {
    if (typeof index === "number") {
      throw new InjectAsParameterError();
    } else {
      const { identifier, tag = null, refresh = false } = injectOptions;
      const finalConfig: InjectConfig = {
        identifier,
        tag,
        refresh,
      };
      Registrar.registerAttributeInject(target.constructor, key, finalConfig);
    }
  };
}

/**
 * The @InjectAll decorator indicates that a class property or function parameter should be populated with multiple instances from the DI container
 *
 * @param injectOptions.identifier - A valid service identifier for this service. For a class, the class itself will suffice. An instance of each service with this identifier will be injected
 * @param injectOptions.refresh - If set to true, this makes sure that the injected instances are refreshed every time
 */
export function InjectAll(identifier: ServiceIdentifier, refresh = false) {
  return (target: any, key: string | symbol, index?: number) => {
    if (typeof index === "number") {
      throw new InjectAsParameterError();
    } else {
      Registrar.registerAttributeAllService(
        target.constructor,
        identifier,
        key,
        refresh
      );
    }
  };
}

/**
 * The @Parameter decorator is used to inject values that are not Services. Often, these are configuration strings or other static values that won't change over your application's lifetime
 *
 * @param paramKey Any valid service identifier will do here
 */
export function Parameter(paramKey: string | symbol | Constructor) {
  return (
    target: any,
    key: string | symbol | undefined,
    index?: number
  ): void => {
    if (typeof index === "number") {
      if (key !== undefined) {
        throw new NotInConstructorError();
      }

      Registrar.registerConstructorParameter(target, index, paramKey);
    } else {
      if (key === undefined) {
        throw new Error(
          "Parameter injection failed because `key` is undefined in the decorator!"
        );
      }
      Registrar.registerAttributeParameter(target.constructor, key, paramKey);
      Object.defineProperty(target, key, {
        get: () => Registrar.getContainer().getParameter(paramKey),
      });
    }
  };
}
