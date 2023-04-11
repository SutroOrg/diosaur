import { getContainer } from "../mod.ts";
import { Service, Inject } from "./Decorators.ts";
import chai from "https://cdn.skypack.dev/chai@4.3.4?dts";
const expect = chai.expect;

@Service()
class A {
  public foo() {
    return 1;
  }
}

@Service()
class B {
  constructor(@Inject({ identifier: A }) public readonly a: A) {}
}

Deno.test("constructor injection works", async () => {
  const container = await getContainer();
  const b = container.get(B);
  expect(b.a.foo()).to.equal(1);
});
