import { SCOPE } from "../Decorators.ts";
import { Reflect } from "../Reflect.ts";
import { UnregisteredServiceError } from "../Errors.ts";
import {
  AttributeInjectAllService,
  BaseInjectAllService,
  ConstructorInjectAllService,
} from "../Metadata/AllServiceInjection.ts";
import {
  AttributeInjectedParameter,
  BaseInjectedParameter,
  ConstructorInjectedParameter,
} from "../Metadata/ParameterInjection.ts";
import RegisteredFactory from "../Metadata/RegisteredFactory.ts";
import {
  AttributeInjectedService,
  BaseInjectedService,
  ConstructorInjectedService,
} from "../Metadata/ServiceInjection.ts";
import {
  AnyObject,
  Constructor,
  ParameterBag,
  ServiceIdentifier,
} from "../Types.ts";
import DependencyGraph from "./DependencyGraph.ts";
import { Graph, Node } from "./Graph.ts";
import LazyProxy from "./LazyProxy.ts";

type TagArray = Array<string | null>;
type IdentifierTags = Map<ServiceIdentifier, TagArray>;

type TagToService = Map<string | null, Object>;
type IdentifierToService = Map<ServiceIdentifier, TagToService>;
type ScopeServices = Map<string, IdentifierToService>;

class ServiceResolver {
  private graph: Graph;

  private identifierTags: IdentifierTags = new Map();

  private scopeServices: ScopeServices = new Map();

  private singletons: Map<ServiceIdentifier, TagToService> = new Map();

  constructor(
    private factories: RegisteredFactory<unknown>[],
    injections: BaseInjectedService[],
    registeredParameters: BaseInjectedParameter[],
    registeredAllInjections: BaseInjectAllService[],
    private parameters: ParameterBag
  ) {
    const graph = new DependencyGraph(
      factories,
      injections,
      registeredParameters,
      registeredAllInjections,
      parameters
    );
    this.graph = graph.build();

    factories.forEach((injection) => {
      const { tag, identifier } = injection.config;
      if (!this.identifierTags.has(identifier))
        this.identifierTags.set(identifier, []);
      if ((this.identifierTags.get(identifier) as TagArray).includes(tag)) {
        throw new Error(
          `Trying to register 2 services identified with ${identifier.toString()} and tag ${tag}`
        );
      }
      (this.identifierTags.get(identifier) as TagArray).push(tag);
    });
  }

  public async warmup(): Promise<void> {
    const singletons: Node[] = [];
    this.graph.forEachNode((node) => {
      if (
        node.data instanceof RegisteredFactory &&
        node.data.config.scoping === SCOPE.singleton
      ) {
        singletons.push(node);
      }
    });
    for (const singleton of singletons) {
      const { config } = singleton.data as RegisteredFactory<unknown>;
      const service = await this.instantiateAsync(singleton);
      if (!this.singletons.has(config.identifier))
        this.singletons.set(config.identifier, new Map());
      (this.singletons.get(config.identifier) as TagToService).set(
        config.tag,
        service
      );
    }
  }

  public enterScope(scope: string): void {
    if (!this.scopeServices.has(scope)) {
      this.scopeServices.set(scope, new Map());
    }
  }

  public exitScope(scope: string): void {
    if (this.scopeServices.has(scope)) {
      // Copy all service instance into other scopes if any
      const services = this.scopeServices.get(scope) as IdentifierToService;
      this.scopeServices.delete(scope);
      services.forEach((tagsServices, identifier) => {
        tagsServices.forEach((service, tag) => {
          const { config } = (
            this.graph.getNode(
              DependencyGraph.serviceKey(identifier, tag)
            ) as Node
          ).data as RegisteredFactory<unknown>;
          const intersectingScopes = this.getCurrentScopes().filter((it) =>
            config.customScopes.includes(it)
          );
          if (intersectingScopes.length > 0) {
            const nextScope = intersectingScopes[0];
            if (!this.scopeServices.has(nextScope))
              this.scopeServices.set(nextScope, new Map());
            if (
              !(this.scopeServices.get(nextScope) as IdentifierToService).has(
                identifier
              )
            ) {
              (this.scopeServices.get(nextScope) as IdentifierToService).set(
                identifier,
                new Map()
              );
            }

            (
              (this.scopeServices.get(nextScope) as IdentifierToService).get(
                identifier
              ) as TagToService
            ).set(tag, service);
          }
        });
      });
    }
  }

  public getParameter(paramKey: string | symbol | Constructor): any {
    return this.parameters.get(paramKey);
  }

  public getAll(identifier: ServiceIdentifier): any[] {
    if (!this.identifierTags.has(identifier)) {
      throw new UnregisteredServiceError(identifier, null, true);
    }
    return (this.identifierTags.get(identifier) as TagArray).map((tag) =>
      this.get(identifier, tag)
    );
  }

  public get(identifier: ServiceIdentifier, tag: string | null): any {
    tag = this.resolveTag(tag);
    const node = this.graph.getNode(
      DependencyGraph.serviceKey(identifier, tag)
    );
    if (!node) {
      throw new UnregisteredServiceError(identifier, tag);
    }
    const serviceConfig = node.data as RegisteredFactory<unknown>;
    switch (serviceConfig.config.scoping) {
      case SCOPE.singleton:
        return (this.singletons.get(identifier) as TagToService).get(tag);
      case SCOPE.renewable:
        return this.instantiate(node);
      case SCOPE.custom: {
        const availableScopes = this.getCurrentScopes().filter((it) =>
          serviceConfig.config.customScopes.includes(it)
        );
        for (const scope of availableScopes) {
          if (
            this.scopeServices.has(scope) &&
            (this.scopeServices.get(scope) as IdentifierToService).has(
              identifier
            ) &&
            (
              (this.scopeServices.get(scope) as IdentifierToService).get(
                identifier
              ) as TagToService
            ).has(tag)
          ) {
            return (
              (this.scopeServices.get(scope) as IdentifierToService).get(
                identifier
              ) as TagToService
            ).get(tag);
          }
        }
        // No service in scope yet, add a new
        const service = this.instantiate(node);
        if (availableScopes.length > 0) {
          const scope = availableScopes[0];
          if (!this.scopeServices.has(scope))
            this.scopeServices.set(scope, new Map());
          if (
            !(this.scopeServices.get(scope) as IdentifierToService).has(
              identifier
            )
          ) {
            (this.scopeServices.get(scope) as IdentifierToService).set(
              identifier,
              new Map()
            );
          }
          (
            (this.scopeServices.get(scope) as IdentifierToService).get(
              identifier
            ) as TagToService
          ).set(tag, service);
        }
        return service;
      }
      default:
        throw new Error(`Unknown scope type ${serviceConfig.config.scoping}`);
    }
  }

  private getCurrentScopes(): string[] {
    return [...this.scopeServices.keys()];
  }

  private resolveTag(tag: string | null): typeof tag {
    if (tag !== null && tag.startsWith("@")) {
      const paramKey = tag.slice(1);
      if (!this.parameters.has(paramKey)) {
        throw new Error(
          `Trying to reference a dependency with a parameter, given key ${tag} but no parameter set`
        );
      } else return this.getParameter(paramKey);
    }
    return tag;
  }

  private instantiate(node: Node): AnyObject {
    const config = node.data as RegisteredFactory<AnyObject>;
    const [constructorParams, attributes] = this.buildServiceDependencies(node);
    // Factory resolve is not async, we block it in decorator thus we can simply call resolve
    const service = config.factory.resolve(constructorParams);
    return this.postServiceCreation(service, attributes);
  }

  private async instantiateAsync(node: Node): Promise<AnyObject> {
    const config = node.data as RegisteredFactory<AnyObject>;
    const [constructorParams, attributes] =
      await this.buildServiceDependenciesAsync(node);
    const service = await config.factory.resolve(constructorParams);
    return this.postServiceCreation(service, attributes);
  }

  private postServiceCreation(
    service: AnyObject,
    attributes: { key: string | symbol; arg: any }[]
  ): AnyObject {
    attributes.forEach(({ key, arg }) => {
      Reflect.defineProperty(service, key, {
        get: () => arg,
      });
    });
    return service;
  }

  private setTo(
    parameters: { arg: any; index: number }[],
    attributes: { key: string | symbol; arg: any }[],
    arg: any,
    data: BaseInjectAllService | BaseInjectedParameter | BaseInjectedService
  ): void {
    if (data.getType() === "constructor") {
      parameters.push({
        arg,
        index: (
          data as
            | ConstructorInjectAllService
            | ConstructorInjectedParameter
            | ConstructorInjectedService
        ).index,
      });
    } else if (data.getType() === "attribute") {
      attributes.push({
        arg,
        key: (
          data as
            | AttributeInjectAllService
            | AttributeInjectedParameter
            | AttributeInjectedService
        ).attributeKey,
      });
    }
  }

  private buildServiceDependencies(
    node: Node
  ): [any[], { key: string | symbol; arg: any }[]] {
    const parameters: { arg: any; index: number }[] = [];
    const attributes: { key: string | symbol; arg: any }[] = [];

    node.links
      .filter((link) => link.toId === node.id)
      .forEach((dependencyLink) => {
        const { data } = dependencyLink;
        let arg = null;
        if (data instanceof BaseInjectedParameter) {
          arg = this.getParameter(data.parameterKey);
        } else if (data instanceof BaseInjectedService) {
          arg = data.config.refresh
            ? new LazyProxy(
                () => this.get(data.config.identifier, data.config.tag) as any
              )
            : this.get(data.config.identifier, data.config.tag);
        } else if (data instanceof BaseInjectAllService) {
          arg = data.refresh
            ? new LazyProxy(() => this.getAll(data.identifier) as any[])
            : this.getAll(data.identifier);
        }
        this.setTo(parameters, attributes, arg, data);
      });

    return [
      parameters
        .sort((a, b) => (a.index > b.index ? 1 : -1))
        .map((it) => it.arg),
      attributes,
    ];
  }

  private async buildServiceDependenciesAsync(
    node: Node
  ): Promise<[any[], { key: string | symbol; arg: any }[]]> {
    const parameters: { arg: any; index: number }[] = [];
    const attributes: { key: string | symbol; arg: any }[] = [];
    const dependencyLinksData: any = [];
    node.links
      .filter((link) => link.toId === node.id)
      .forEach((dependencyLink) => {
        dependencyLinksData.push(dependencyLink.data);
      });

    for (const data of dependencyLinksData) {
      let arg = null;
      if (data instanceof BaseInjectedParameter) {
        arg = this.getParameter(data.parameterKey);
      } else if (data instanceof BaseInjectedService) {
        arg = data.config.refresh
          ? new LazyProxy(
              () => this.get(data.config.identifier, data.config.tag) as any
            )
          : await this.getAsync(data.config.identifier, data.config.tag);
      } else if (data instanceof BaseInjectAllService) {
        arg = data.refresh
          ? new LazyProxy(() => this.getAll(data.identifier) as any[])
          : await this.getAllAsync(data.identifier);
      }
      this.setTo(parameters, attributes, arg, data);
    }

    return [
      parameters
        .sort((a, b) => (a.index > b.index ? 1 : -1))
        .map((it) => it.arg),
      attributes,
    ];
  }

  private async getAllAsync(identifier: ServiceIdentifier): Promise<any[]> {
    if (!this.identifierTags.has(identifier)) {
      throw new UnregisteredServiceError(identifier, null, true);
    }
    const services = [];

    for (const tag of this.identifierTags.get(identifier) ?? []) {
      services.push(await this.getAsync(identifier, tag));
    }
    return services;
  }

  private async getAsync(
    identifier: ServiceIdentifier,
    tag: string | null
  ): Promise<object | undefined> {
    tag = this.resolveTag(tag);
    const node = this.graph.getNode(
      DependencyGraph.serviceKey(identifier, tag)
    );
    if (!node) {
      throw new UnregisteredServiceError(identifier, tag);
    }
    const data = node.data as RegisteredFactory<unknown>;
    if (data.config.scoping === SCOPE.singleton) {
      const existingInstance = (
        this.singletons.get(data.config.identifier) as TagToService
      ).get(data.config.tag);
      return existingInstance
        ? existingInstance
        : await this.instantiateAsync(node);
    } else return this.get(identifier, tag);
  }
}

export default ServiceResolver;
