import { IncorrectFactoryError, NotInConstructorError } from "./Errors.ts";
import IFactory from "./IFactory.ts";
import Registrer from "./Metadata/Registrer.ts";
import { Reflect } from "./Reflect.ts";
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

export const Service = (config: Partial<ServiceConfig> = {}) => {
  return <T extends Constructor>(target: T) => {
    Registrer.registerService(target, {
      ...defaultConfig(target),
      ...config,
    });
  };
};

/** Factory */
export const Factory = (
  createdService: ServiceIdentifier,
  config: Partial<ServiceConfig> = {}
) => {
  return <T extends Constructor<IFactory>>(factoryConstructor: T) => {
    const factory = new factoryConstructor();
    if (!("resolve" in factory)) {
      throw new IncorrectFactoryError(factoryConstructor);
    }

    const isPromise =
      Reflect.getMetadata("design:returntype", factory, "resolve") === Promise;
    if (config.scoping && config.scoping !== SCOPES.singleton && isPromise) {
      throw new Error("Async factories MUST be scoped as singletons");
    }

    Registrer.registerFactory(factory, createdService, {
      ...defaultConfig(createdService),
      ...config,
    });
  };
};

/** Inject */
export interface InjectConfig {
  tag: string | null;
  identifier: ServiceIdentifier;
  refresh: boolean;
}

export const defaultInjectConfig = (identifier: ServiceIdentifier) => ({
  identifier,
  tag: null,
  refresh: false,
});

export const Inject = (config: Partial<InjectConfig> = {}) => {
  return (target: any, key: string | symbol, index?: number) => {
    if (typeof index === "number") {
      if (key !== undefined) {
        throw new NotInConstructorError();
      }

      const constructorParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        target,
        key
      );
      const finalConfig = {
        ...defaultInjectConfig(constructorParamTypes[index]),
        ...config,
      };
      Registrer.registerConstructorInject(target, index, finalConfig);
    } else {
      const serviceIdentifier = Reflect.getMetadata("design:type", target, key);
      const finalConfig: InjectConfig = {
        ...defaultInjectConfig(serviceIdentifier),
        ...config,
      };
      Registrer.registerAttributeInject(target.constructor, key, finalConfig);
    }
  };
};

/** Inject All */
export const InjectAll = (identifier: ServiceIdentifier, refresh = false) => {
  return (target: any, key: string | symbol, index?: number) => {
    if (typeof index === "number") {
      if (key !== undefined) {
        throw new NotInConstructorError();
      }

      const constructorParamTypes = Reflect.getMetadata(
        "design:paramtypes",
        target,
        key
      );
      const paramType = constructorParamTypes[index];
      if (paramType.name !== "Array") {
        throw new Error(
          `@InjectAll decorator can only be used with an array parameter on service ${target.name}`
        );
      }
      Registrer.registerConstructorAllService(
        target,
        identifier,
        index,
        refresh
      );
    } else {
      Registrer.registerAttributeAllService(
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
  return (target: any, key: string | symbol, index?: number) => {
    if (typeof index === "number") {
      if (key !== undefined) {
        throw new NotInConstructorError();
      }

      Registrer.registerConstructorParameter(target, index, paramKey);
    } else {
      Registrer.registerAttributeParameter(target.constructor, key, paramKey);
      console.log(`Adding getter to ${String(key)} for ${String(paramKey)}`, {
        target,
      });
      Object.defineProperty(target, key, {
        get: () => {
          console.log(`Called getter for prop ${String(key)}`, target);
          return Registrer.getContainer().getParameter(paramKey);
        },
      });
    }
  };
};
