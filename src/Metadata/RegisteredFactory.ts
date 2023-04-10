import { ServiceConfig } from "../Decorators.ts";
import { IFactory } from "../IFactory.ts";
import { ServiceClassIdentifier } from "../Types.ts";

export default class RegisteredFactory<R> {
  constructor(
    public readonly factory: IFactory<R>,
    public readonly serviceClass: ServiceClassIdentifier,
    public readonly config: ServiceConfig
  ) {}
}
