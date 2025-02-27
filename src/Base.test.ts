import { Service, getContainer, setParameter, Inject } from "./index.ts";
import { Container, IContainer } from "./Container.ts";
import { SCOPE, InjectAll, Parameter } from "./Decorators.ts";
import { describe, it } from "https://deno.land/std@0.177.0/testing/bdd.ts";
import chai from "https://cdn.skypack.dev/chai@4.3.4?dts";
const expect = chai.expect;

describe("Diosaur service registration", () => {
  @Service()
  class A {}

  @Service()
  class B {}

  @Service()
  class C {}

  class S {
    getName(): string {
      return this.constructor.name;
    }
  }

  @Service({ identifier: S, tag: "s1" })
  class S1 extends S {}

  @Service({ identifier: S, tag: "s2" })
  class S2 extends S {}

  @Service({ identifier: S, tag: "s3" })
  class S3 extends S {}

  setParameter("yo", "yoyo");
  setParameter("sid", "s3");

  @Service()
  class dep1 {
    @Inject({ identifier: S, tag: "s2" })
    public readonly s!: S;

    @InjectAll(S)
    public readonly allS!: S[];

    @Parameter("yo")
    public readonly param!: string;

    constructor(@Parameter("sid") public readonly sid: string) {}
  }

  @Service()
  class dep2 {
    @Inject({ identifier: S, tag: "@sid" })
    public readonly s!: S;
  }

  @Service({ scoping: SCOPE.renewable })
  class Random {
    public readonly n: Symbol = Symbol(Math.ceil(Math.random() * 1000));
  }

  @Service()
  class R1 {
    @Inject({ identifier: Random, refresh: true })
    public readonly r!: Random;
  }

  @Service()
  class R2 {
    @Inject({ identifier: Random, refresh: false })
    public readonly r!: Random;
  }

  abstract class subScoped {
    public readonly s: Symbol = Symbol();
  }

  @Service({
    scoping: SCOPE.custom,
    customScopes: ["scope1"],
  })
  class Scoped1 extends subScoped {}

  @Service({
    scoping: SCOPE.custom,
    customScopes: ["scope2"],
  })
  class Scoped2 extends subScoped {}

  @Service({
    scoping: SCOPE.custom,
    customScopes: ["scope1", "scope2"],
  })
  class ScopedAll extends subScoped {}

  @Service()
  class RScoped {
    @Inject({ identifier: Scoped1, refresh: true })
    public readonly s1!: Scoped1;

    @Inject({ identifier: Scoped2, refresh: true })
    public readonly s2!: Scoped2;

    @Inject({ identifier: ScopedAll, refresh: true })
    public readonly s12!: ScopedAll;
  }

  let container: IContainer;

  it("Should support retrieving the container", async () => {
    container = await getContainer();
    expect(container).to.be.instanceof(Container);
  });

  it("Should support retrieving services", () => {
    expect(container.get(A)).to.be.instanceof(A);
    expect(container.get(B)).to.be.instanceof(B);
    expect(container.get(C)).to.be.instanceof(C);
  });

  it("Should support retrieving a parameter", () => {
    expect(container.getParameter("yo")).to.equal("yoyo");
  });

  it("Should support injecting a parameter through constructor", () => {
    expect(container.get(dep1).sid).to.equal("s3");
  });

  it("Should support retrieving a tagged service", () => {
    expect(container.get(S, "s2")).to.be.instanceof(S2);
  });

  it("Should support injecting a parameter", () => {
    expect(container.get(dep1).param).to.equal("yoyo");
    expect(container.get(dep1).param).to.equal(container.getParameter("yo"));
  });

  it("Should support retrieving all services identified by an identifier", () => {
    const sservices = container.getAll(S);
    expect(sservices.length).to.equal(3);
    [S1, S2, S3].forEach((cls, i) =>
      expect(sservices[i]).to.be.instanceof(cls)
    );
  });

  it("Should support injecting all services with given identifier", () => {
    const sservices = container.get(dep1).allS;
    expect(sservices.length).to.equal(3);
    [S1, S2, S3].forEach((cls, i) =>
      expect(sservices[i]).to.be.instanceof(cls)
    );
  });

  it("Should allow services to retrieve their dependencies", () => {
    expect(container.get(dep1).s.getName()).to.equal("S2");
  });

  it("Should allow services to tag their dependencies based on parameter", () => {
    expect(container.get(dep2).s.getName()).to.equal("S3");
  });

  it("Should support service renewable scoping with constant refresh", () => {
    const rs = container.get(R1);
    const s1 = rs.r.n;
    const s2 = rs.r.n;
    expect(s1).not.to.equal(s2);
  });

  it("Should support service renewable scoping with no refresh", () => {
    const rs = container.get(R2);
    const s1 = rs.r.n;
    const s2 = rs.r.n;
    expect(s1).to.equal(s2);
  });

  it("Should support custom scopes with no scope set", () => {
    const rscoped = container.get(RScoped);
    expect(rscoped.s1.s).not.to.equal(rscoped.s1.s);
  });

  it("Should support custom scope", () => {
    const rscoped = container.get(RScoped);
    container.enterScope("scope1");
    expect(rscoped.s1.s).to.equal(rscoped.s1.s);
    container.exitScope("scope1");
    expect(rscoped.s1.s).not.to.equal(rscoped.s1.s);
  });

  it("Should support multiple custom scopes", () => {
    const rscoped = container.get(RScoped);
    container.enterScope("scope1");
    const sScope1 = rscoped.s12.s;
    expect(sScope1).to.equal(rscoped.s12.s);
    container.enterScope("scope2");
    expect(sScope1).to.equal(rscoped.s12.s);
    container.exitScope("scope1");
    expect(sScope1).to.equal(rscoped.s12.s);
    container.exitScope("scope2");
    expect(sScope1).not.to.equal(rscoped.s12.s);
  });
});
