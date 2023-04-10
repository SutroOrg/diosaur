# Abstracting your services

One of the many advantages of using a dependency injection library
is that you can actually abstract your services from their real implementation.
For example, let's take a cache service:

```typescript
interface ICache {
  set(key: string, value: any): void;

  get(key: string): any;
}
```

We could have multiple class implementing this interface.

```typescript
class RedisCache implements ICache {
  /* ... */
}

class LocalCache implements ICache {
  /* ... */
}
```

These can then be referenced via a union type or an interface.

```typescript
class MyService {
  // Using an union type
  private cache: RedisCache | LocalCache;

  // Using the interface
  private cache: ICache;
}
```

But which implementation should we inject into `MyService.cache` ?

## Identifying your services

When you declare a service with the `@Service` decorator, they are
automatically assigned a _service identifier_. By default,
it's the actual service class which is convenient to register unique
services.

But in the case where you have multiple implementations to answer
a single need, you must provide an identifier that matches all of them.

Taking the previous example, we cannot use an interface because they are erased at runtime. However, you can use constructors, strings and symbols as service identifiers.

Our example could then become:

```typescript
const TYPES = {
  cache: Symbol("cache"),
};

@Service({ identifier: TYPES.cache })
class RedisCache implements ICache {
  /* ... */
}

@Service({ identifier: TYPES.cache })
class LocalCache implements ICache {
  /* ... */
}
```

## Tagging your services

The previous step allowed us to declare multiple implementations with a unique identifier, but we must now have a way to uniquely identify each of them. That's where tagging comes in handy.

As well as identifying services, you can also tag them.

```typescript
const TYPES = {
  cache: Symbol("cache"),
};

@Service({ identifier: TYPES.cache, tag: "redis" })
class RedisCache implements ICache {
  /* ... */
}

@Service({ identifier: TYPES.cache, tag: "local" })
class LocalCache implements ICache {
  /* ... */
}
```

Tags are typed as `string | null`, if you don't provide a tag it's tagged as `null` which means _the default implementation for this identifier_.

Now we can reference our cache implementation in our service:

```typescript
@Service()
class MyService {
  @Inject({ identifier: TYPES.cache, tag: "redis" })
  private cache: ICache;
}
```

But typing it using the interface. As such we decoupled the implementation from the usage completely.

## Manually retrieving a tagged service

You can retrieve tagged services easily by doing

```typescript
import { getContainer } from "diosaur";

const container = await getContainer();
container.get(TYPES.cache, "redis"); // Instance of RedisCache
```

## Parameter as tag

You can define tags as parameters to push things even further.

```typescript
setParameter("cache", "redis");

@Service()
class MyService {
  @Inject({ identifier: TYPES.cache, tag: "@cache" }) // resolves to redis
  private cache: ICache;
}

// ...
const container = await getContainer();
container.get(TYPES.cache, "@cache"); // Instance of RedisCache
```
