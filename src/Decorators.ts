import {
  IncorrectFactoryError,
  InjectAsParameterError,
  NotInConstructorError,
} from "./Errors.ts";
import { IFactory } from "./IFactory.ts";
import Registrar from "./Metadata/Registrar.ts";
import { Constructor, ServiceIdentifier } from "./Types.ts";

/** Service */
export interface ServiceConfig {
  identifier: ServiceIdentifier;
  tag: string | null;
  scoping: "singleton" | "renewable" | "custom";
  customScopes: string[];
}

export const SCOPES = {
  singleton: "singleton",
  newable: "renewable",
  custom: "custom",
} as const;

export const defaultConfig = (
  identifier: ServiceIdentifier
): ServiceConfig => ({
  identifier,
  tag: null,
  scoping: SCOPES.singleton,
  customScopes: [],
});

/**
 *
 */
export const Service = (config: Partial<ServiceConfig> = {}) => {
  return <T extends Constructor>(target: T) => {
    const finalConfig = {
      ...defaultConfig(target),
      ...config,
    };
    Registrar.registerService(target, finalConfig);
  };
};

/** Factory */
export const Factory = (
  createdService: ServiceIdentifier,
  config: Partial<ServiceConfig> = {}
) => {
  return <T extends Constructor<IFactory<unknown>>>(factoryConstructor: T) => {
    const factory = new factoryConstructor();
    if (!("resolve" in factory)) {
      throw new IncorrectFactoryError(factoryConstructor);
    }

    const isPromise = false;
    if (config.scoping && config.scoping !== SCOPES.singleton && isPromise) {
      throw new Error("Async factories MUST be scoped as singletons");
    }

    Registrar.registerFactory(factory, createdService, {
      ...defaultConfig(createdService),
      ...config,
    });
  };
};

export interface InjectConfig {
  tag: string | null;
  identifier: ServiceIdentifier;
  refresh: boolean;
}
interface InjectOptions extends Omit<Partial<InjectConfig>, "identifier"> {
  identifier: InjectConfig["identifier"];
}

/**
 * The @Inject decorator indicates that a class property or function parameter should be populated from the DI container
 *
 * The `identifier` configuration value is required and can be a string, symbol or constructor. It cannot be an interface name, since
 * those are erased at runtime
 *
 * A `tag` can be provided when using identifiers that are not unique.
 *
 * Setting `refresh` to `true` will refresh the injected instance each time it is resolved
 */
export const Inject = ({
  identifier,
  tag = null,
  refresh = false,
}: InjectOptions) => {
  return (target: any, key: string | symbol, index?: number) => {
    if (typeof index === "number") {
      throw new InjectAsParameterError();
    } else {
      const finalConfig: InjectConfig = {
        identifier,
        tag,
        refresh,
      };
      Registrar.registerAttributeInject(target.constructor, key, finalConfig);
    }
  };
};

/** Inject All */
export const InjectAll = (identifier: ServiceIdentifier, refresh = false) => {
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
};

/** Parameter injection */
export const Parameter = (paramKey: string | symbol | Constructor) => {
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
};
