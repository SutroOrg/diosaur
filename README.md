# Sutro Diosaur

_A small dependency injection for Deno_

Sutro Diosaur is a small dependency injection solution written in Typescript for Denowhich aims at making you write the minimum of code, avoiding obvious bindings and other repetitive stuff.

It's a fork of the excellent [diosaur](https://github.com/ovesco/diosaur), but with the non-Deno stuff taken out. In particular, it removes the reliance on `reflect-metadata` since that isn't fully supported in Deno.

## Example

```typescript
import {
  Service,
  Parameter,
  Inject,
  setParameter,
  getContainer,
} from "diosaur";

@Service()
class Doggo {
  constructor(@Parameter("doggoName") private name: string) {}

  bark() {
    return this.name.toUpperCase();
  }
}

@Service()
class JonSnow {
  @Inject({ identifier: Doggo })
  private doggo: Doggo;

  yell() {
    return `I'm Jon with my doggo ${this.doggo.bark()} !`;
  }
}

setParameter("doggoName", "Ghost");

const container = await getContainer();
const jon = container.get(JonSnow);
console.log(jon.yell());
```

The key difference here is the need to provide explicit identifiers for `@Inject`

## Documentation

- [Basic usage](./docs/basic-usage.md)
- [Abstracting your services](./docs/abstracting-your-services.md)
- [Injecting multiple services](./docs/multiple-services.md)
- [Services scopes](./docs/scopes.md)
- [Factories](./docs/factory.md)
- [Refreshing Services](./docs/refreshing-services.md)
