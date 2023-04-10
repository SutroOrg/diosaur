import ServiceResolver from "../Compilation/ServiceResolver.ts";
import { Container, IContainer } from "../Container.ts";
import { InjectConfig, ServiceConfig } from "../Decorators.ts";
import { NotBuiltContainerError } from "../Errors.ts";
import { BasicFactory } from "../Factory.ts";
import { IFactory } from "../IFactory.ts";
import {
  Constructor,
  ParameterBag,
  ServiceClassIdentifier,
  ServiceIdentifier,
} from "../Types.ts";
import {
  AttributeInjectAllService,
  BaseInjectAllService,
  ConstructorInjectAllService,
} from "./AllServiceInjection.ts";
import {
  AttributeInjectedParameter,
  BaseInjectedParameter,
  ConstructorInjectedParameter,
} from "./ParameterInjection.ts";
import RegisteredFactory from "./RegisteredFactory.ts";
import {
  AttributeInjectedService,
  BaseInjectedService,
  ConstructorInjectedService,
} from "./ServiceInjection.ts";

class Registrar {
  private static parameters: ParameterBag = new Map();

  private static factories: Array<RegisteredFactory<unknown>> = [];

  private static injections: Array<BaseInjectedService> = [];

  private static allInjections: Array<BaseInjectAllService> = [];

  private static injectedParameters: Array<BaseInjectedParameter> = [];

  private static _container: IContainer | null = null;

  static getContainer(): IContainer {
    if (!Registrar._container) {
      throw new NotBuiltContainerError();
    }
    return Registrar._container;
  }

  static async build(refresh = false): Promise<IContainer> {
    if (Registrar._container && !refresh) return Registrar._container;

    const resolver = new ServiceResolver(
      this.factories,
      this.injections,
      this.injectedParameters,
      this.allInjections,
      this.parameters
    );
    await resolver.warmup();
    Registrar._container = new Container(resolver);
    return Registrar._container;
  }

  static setParameter(key: string | symbol | Constructor, value: any): void {
    Registrar.parameters.set(key, value);
  }

  static registerService(targetType: Constructor, config: ServiceConfig): void {
    this.registerFactory(new BasicFactory(targetType), targetType, config);
  }

  static registerFactory<R>(
    factory: IFactory<R>,
    targetType: ServiceClassIdentifier,
    config: ServiceConfig
  ): void {
    Registrar.factories.push(
      new RegisteredFactory(factory, targetType, config)
    );
  }

  static registerAttributeInject(
    service: ServiceClassIdentifier,
    key: string | symbol,
    config: InjectConfig
  ): void {
    Registrar.injections.push(
      new AttributeInjectedService(service, key, config)
    );
  }

  static registerConstructorInject(
    service: ServiceClassIdentifier,
    index: number,
    config: InjectConfig
  ): void {
    Registrar.injections.push(
      new ConstructorInjectedService(service, index, config)
    );
  }

  static registerAttributeParameter(
    service: ServiceClassIdentifier,
    key: string | symbol,
    paramKey: string | symbol | Constructor
  ): void {
    Registrar.injectedParameters.push(
      new AttributeInjectedParameter(service, key, paramKey)
    );
  }

  static registerConstructorParameter(
    service: ServiceClassIdentifier,
    index: number,
    paramKey: string | symbol | Constructor
  ): void {
    Registrar.injectedParameters.push(
      new ConstructorInjectedParameter(service, index, paramKey)
    );
  }

  static registerAttributeAllService(
    service: ServiceClassIdentifier,
    identifier: ServiceIdentifier,
    paramKey: string | symbol,
    refresh: boolean
  ): void {
    Registrar.allInjections.push(
      new AttributeInjectAllService(service, identifier, paramKey, refresh)
    );
  }

  static registerConstructorAllService(
    service: ServiceClassIdentifier,
    identifier: ServiceIdentifier,
    index: number,
    refresh: boolean
  ): void {
    Registrar.allInjections.push(
      new ConstructorInjectAllService(service, identifier, index, refresh)
    );
  }
}

export default Registrar;
