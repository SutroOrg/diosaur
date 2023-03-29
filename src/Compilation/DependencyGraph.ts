import { MissingServiceDefinitionError } from "../Errors.ts";
import { BaseInjectAllService } from "../Metadata/AllServiceInjection.ts";
import { BaseInjectedParameter } from "../Metadata/ParameterInjection.ts";
import RegisteredFactory from "../Metadata/RegisteredFactory.ts";
import { BaseInjectedService } from "../Metadata/ServiceInjection.ts";
import {
  ParameterBag,
  ServiceClassIdentifier,
  ServiceIdentifier,
} from "../Types.ts";
import { resolveTag, uniqid } from "../Utils.ts";
import { Graph, Node } from "./Graph.ts";

class DependencyGraph {
  private dependencyGraph: Graph = new Graph();

  private serviceClassToKey: Map<ServiceClassIdentifier, string> = new Map();

  private identifierServices: Map<ServiceIdentifier, ServiceClassIdentifier[]> =
    new Map();

  constructor(
    private factories: RegisteredFactory[],
    private injections: BaseInjectedService[],
    private injectedParameters: BaseInjectedParameter[],
    private allInjections: BaseInjectAllService[],
    private parameterBag: ParameterBag
  ) {}

  getNodeByIdentifier(
    identifier: ServiceIdentifier,
    tag: string | null
  ): Node | null {
    return this.dependencyGraph.getNode(
      DependencyGraph.serviceKey(identifier, tag)
    );
  }

  build(): Graph {
    this.factories.forEach((registeredFactory) => {
      const { identifier } = registeredFactory.config;
      const key = DependencyGraph.serviceKey(
        identifier,
        registeredFactory.config.tag
      );
      if (this.dependencyGraph.hasNode(key)) {
        throw new Error(
          `Trying to register ${registeredFactory.serviceClass.toString()}, but another service exist for the same identifier and same tag`
        );
      }

      this.serviceClassToKey.set(registeredFactory.serviceClass, key);
      this.dependencyGraph.addNode(key, registeredFactory);

      if (!this.identifierServices.has(identifier)) {
        this.identifierServices.set(identifier, []);
      }

      this.identifierServices
        ?.get(identifier)
        ?.push(registeredFactory.serviceClass);
    });

    this.parameterBag.forEach((value, key) => {
      const paramKey = DependencyGraph.paramKey(key);
      this.dependencyGraph.addNode(paramKey, value);
    });

    this.injections.forEach((injectedService) => {
      const serviceKey = this.serviceClassToKey.get(
        injectedService.serviceClass
      ) as string;
      const injectedServiceKey = DependencyGraph.serviceKey(
        injectedService.config.identifier,
        resolveTag(injectedService.config.tag, this.parameterBag)
      );
      if (!this.dependencyGraph.hasNode(injectedServiceKey)) {
        throw new MissingServiceDefinitionError(
          `Trying to inject service ${injectedServiceKey} into ${serviceKey} but ${injectedServiceKey} is not registered`
        );
      }
      if (!this.dependencyGraph.hasNode(serviceKey)) {
        throw new MissingServiceDefinitionError(
          `Trying to inject service ${injectedServiceKey} into ${serviceKey} but ${serviceKey} one of them is not registered`
        );
      }
      this.dependencyGraph.addLink(
        injectedServiceKey,
        serviceKey,
        injectedService
      );
    });

    this.allInjections.forEach((registeredAllInjection) => {
      const { identifier } = registeredAllInjection;
      const allKey = DependencyGraph.allServiceKey(identifier);
      const serviceKey = this.serviceClassToKey.get(
        registeredAllInjection.serviceClass
      ) as string;
      if (
        !this.dependencyGraph.hasNode(serviceKey) ||
        !this.identifierServices.has(identifier)
      ) {
        throw new MissingServiceDefinitionError(
          `Trying to inject ${allKey} services into ${serviceKey} but one of those definition doesn't exist`
        );
      }

      if (!this.dependencyGraph.hasNode(allKey)) {
        this.dependencyGraph.addNode(allKey);

        this.identifierServices
          ?.get(identifier)
          ?.map((serviceConstructor) =>
            this.serviceClassToKey.get(serviceConstructor)
          )
          .forEach((relatedDependencyKey) => {
            this.dependencyGraph.addLink(
              relatedDependencyKey as string,
              allKey
            );
          });
      }
      this.dependencyGraph.addLink(allKey, serviceKey, registeredAllInjection);
    });

    this.injectedParameters.forEach((injectedParameter) => {
      const serviceKey = this.serviceClassToKey.get(
        injectedParameter.serviceClass
      ) as string;
      const injectedParameterKey = DependencyGraph.paramKey(
        injectedParameter.parameterKey
      );
      if (
        !(
          this.dependencyGraph.hasNode(serviceKey) &&
          this.dependencyGraph.hasNode(injectedParameterKey)
        )
      ) {
        throw new MissingServiceDefinitionError(
          `Trying to inject parameter ${injectedParameterKey} into ${serviceKey} but one of them is not registered`
        );
      }
      this.dependencyGraph.addLink(
        injectedParameterKey,
        serviceKey,
        injectedParameter
      );
    });

    return this.dependencyGraph;
  }

  detectGraphServiceLeaves(): Node[] {
    const leaves: Node[] = [];
    this.dependencyGraph.forEachNode((node) => {
      if (
        node.links === null ||
        node.links.filter((link) => link.toId !== node.id).length === 0
      ) {
        if (typeof node.id === "string" && !node.id.startsWith("param-")) {
          leaves.push(node);
        }
      }
    });

    return leaves;
  }

  static serviceKey(identifier: ServiceIdentifier, tag: string | null): string {
    let identifierString = "";
    switch (typeof identifier) {
      case "string":
        identifierString = identifier.toString();
        break;
      case "symbol":
        identifierString = uniqid();
        break;
      case "function":
        identifierString = identifier.name;
      default:
        throw new Error(
          `identifier is a ${typeof identifier} which is not supported`
        );
    }

    return `${identifierString}(${tag || ""})`;
  }

  static paramKey(identifier: ServiceIdentifier): string {
    let identifierString = identifier.toString();
    if (typeof identifier === "symbol") identifierString = uniqid();
    else if (typeof identifier === "function")
      identifierString = identifier.name;
    return `param-${identifierString}`;
  }

  static allServiceKey(identifier: ServiceIdentifier): string {
    return `all-${DependencyGraph.serviceKey(identifier, null)}`;
  }
}

export default DependencyGraph;
