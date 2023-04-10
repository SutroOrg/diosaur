import {
  getContainer,
  register,
  registerAsync,
  refreshContainer,
} from "./index.ts";
import { IContainer } from "./Container.ts";
import { Factory } from "./Decorators.ts";
import { IAsyncFactory, IFactory } from "./IFactory.ts";
import { describe, it } from "https://deno.land/std@0.177.0/testing/bdd.ts";
import chai from "https://cdn.skypack.dev/chai@4.3.4?dts";

const expect = chai.expect;

class A1 {
  a = 1;
}

class A2 {
  a = 2;
}

@Factory(A1)
class F1 implements IFactory<A1> {
  resolve() {
    return new A1();
  }
}

@Factory(A1, { tag: "async" })
class AsyncF1 implements IAsyncFactory<A1> {
  async resolve() {
    return new A1();
  }
}

@Factory(A2)
class F2 implements IAsyncFactory<A2> {
  async resolve() {
    return new A2();
  }
}

describe("Diosaur factory registration", () => {
  let container: IContainer;
  it("Should support retrieving container", async () => {
    container = await getContainer();
  });

  it("Should support registering sync factories", () => {
    expect(container.get(A1)).to.be.instanceof(A1);
  });

  it("Should support registering async factories", () => {
    expect(container.get(A2)).to.be.instanceof(A2);
    expect(container.get(A1, "async")).to.be.instanceof(A1);
  });

  it("Should support registering anonymous factories", async () => {
    register("abracadabra", () => "a");
    register("b", () => () => "b");
    register("c", { yo: "yo" });
    registerAsync(
      "d",
      new Promise((resolve) => {
        setTimeout(() => {
          resolve("D");
        }, 100);
      })
    );
    container = await refreshContainer();
    expect(container.get("abracadabra")).to.equal("a");

    expect(container.get<() => string>("b")()).to.equal("b");

    expect(container.get<any>("c").yo).to.equal("yo");
    expect(container.get("d")).to.equal("D");
  });
});
