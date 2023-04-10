# Basic usage

Here's how to get started with Dependency Injection with this module.

## Service

A service can be virtually anything, an object, a function, a primitive...
It's the way you use that makes it a service in itself. Later, you reference it and then inject it in other services later.

### Class service

You can define a `class` as service by decorating it with the `@Service` decorator.

```typescript
@Service()
class MyService {
  // ...
}
```

What did we actually do here? By decorating the `MyService` class with the `@Service` decorator, we the DI Registrar that
this class is a service and its lifecycle must be handled. It could be a dependency and be
injected in other services as well as require some dependencies as we'll now.

### Injecting dependencies

Your services will probably require other services to work, for example a database connection,
a mail services or other. As such, you can inject some services in other services by doing the following.

```typescript
@Service()
class OtherService {
  // Injecting through attribute
  @Inject()
  private myService: MyService;

  // Injecting through constructor
  constructor(@Inject() myService: MyService) {}
}
```

Now, when we retrieve the `OtherService` object, its `myService` attribute will automatically be resolved to the correct instance of `MyService`.

> ⚠️ Injecting services through constructor ⚠️
>
> Injecting dependencies through constructor is an experimental feature which is documented
> in a dedicated chapter.

## Parameters

You can also register and inject `Parameters`. Those are actually static values that won't change throughout the life of your program, usually they only contain strings or primitive values like
database credentials. You can register a parameter by doing the following:

```typescript
import { setParameter, Parameter } from "diosaur";

setParameter("paramKey", "value");
```

And you can inject it by doing the following:

```typescript
class MyService {
  @Parameter("paramKey")
  private param: string;

  // Or directly inject it through constructor
  constructor(@Parameter("paramKey") private param: string) {}
}
```

## Retrieving a service

Now that all of your services class are all setup we can build the DI container and resolve our services.

```typescript
import { getContainer } from "diosaur";

const container = await getContainer();
const myService = container.get(MyService); // Instance of MyService
const myParam = container.get("paramKey"); // value
```
