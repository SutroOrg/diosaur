import { ServiceConfig } from "../Decorators.ts";
import IFactory from "../IFactory.ts";
import { ServiceClassIdentifier } from "../Types.ts";

export default class RegisteredFactory {
  constructor(
    public readonly factory: IFactory,
    public readonly serviceClass: ServiceClassIdentifier,
    public readonly config: ServiceConfig
  ) {
    console.log(`RegisteredFactory`, { config, serviceClass });
  }
}
