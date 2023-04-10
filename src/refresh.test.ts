import { getContainer } from "./index.ts";
import { IContainer } from "./Container.ts";
import { Service, Inject, SCOPE } from "./Decorators.ts";
import { describe, it } from "https://deno.land/std@0.177.0/testing/bdd.ts";
import chai from "https://cdn.skypack.dev/chai@4.3.4?dts";

const expect = chai.expect;

@Service({ scoping: SCOPE.singleton })
class Singleton {
  public readonly sym = Symbol();
}

@Service({ scoping: SCOPE.renewable })
class Renewable {
  public readonly sym = Symbol();
}

@Service({ scoping: SCOPE.custom, customScopes: ["scope1", "scope2"] })
class Custom {
  public readonly sym = Symbol();
}

@Service()
class Refreshed {
  @Inject({ identifier: Singleton, refresh: true })
  public readonly singleton!: Singleton;

  @Inject({ identifier: Renewable, refresh: true })
  public readonly renewable!: Renewable;

  @Inject({ identifier: Custom, refresh: true })
  public readonly custom!: Custom;
}

@Service()
class NotRefreshed {
  @Inject({ identifier: Singleton, refresh: false })
  public readonly singleton!: Singleton;

  @Inject({ identifier: Renewable, refresh: false })
  public readonly renewable!: Renewable;

  @Inject({ identifier: Custom, refresh: false })
  public readonly custom!: Custom;
}

describe("Diosaur factory registration", () => {
  let container: IContainer;
  it("Should support retrieving container", async () => {
    container = await getContainer();
  });

  it("Should support unrefreshed injection correctly", () => {
    const unrefreshed = container.get(NotRefreshed);

    expect(unrefreshed.singleton.sym).to.equal(unrefreshed.singleton.sym);
    expect(unrefreshed.renewable.sym).to.equal(unrefreshed.renewable.sym);
    expect(unrefreshed.custom.sym).to.equal(unrefreshed.custom.sym);

    const preScopeInstance = unrefreshed.custom.sym;
    container.enterScope("scope1");
    const scope1Instance = unrefreshed.custom.sym;
    container.enterScope("scope2");
    const scope12Instance = unrefreshed.custom.sym;
    container.exitScope("scope1");
    const scope2Instance = unrefreshed.custom.sym;
    container.exitScope("scope2");
    const postScopeInstance = unrefreshed.custom.sym;

    [
      scope1Instance,
      scope12Instance,
      scope2Instance,
      postScopeInstance,
    ].forEach((instance) => expect(preScopeInstance).to.equal(instance));
  });

  it("Should support refreshed injection correctly", () => {
    const refreshed = container.get(Refreshed);

    expect(refreshed.singleton.sym).to.equal(refreshed.singleton.sym);
    expect(refreshed.renewable.sym).not.to.equal(refreshed.renewable.sym);
    expect(refreshed.custom.sym).not.to.equal(refreshed.custom.sym);

    const preScopeInstance = refreshed.custom.sym;
    container.enterScope("scope1");
    const scope1Instance = refreshed.custom.sym;
    container.enterScope("scope2");
    const scope12Instance = refreshed.custom.sym;
    container.exitScope("scope1");
    const scope2Instance = refreshed.custom.sym;
    container.exitScope("scope2");
    const postScopeInstance = refreshed.custom.sym;

    expect(preScopeInstance).not.to.equal(scope1Instance);
    expect(scope1Instance).to.equal(scope12Instance);
    expect(scope1Instance).to.equal(scope2Instance);
    expect(scope2Instance).not.to.equal(postScopeInstance);
    expect(preScopeInstance).not.to.equal(postScopeInstance);
  });
});
