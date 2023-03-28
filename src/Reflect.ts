import { Reflect as MSReflect } from "https://deno.land/x/reflect_metadata@v0.1.12/mod.ts";
import { AnyObject } from "./Types.ts";

function validateTarget(o: unknown, method: string): asserts o is AnyObject {
  if (typeof o !== "object" && o !== null) {
    throw new TypeError(`Non-object passed as target of ${method}`);
  }
}

export class Reflect {
  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/apply
   */
  static apply(target: Function, thisArg: unknown, args: unknown[]) {
    if (typeof target !== "function") {
      throw new TypeError("Pass non-function to Reflect.apply");
    }
    if (typeof args !== "object" || args === null) {
      throw new TypeError("No args passed to Reflect.apply");
    }
    return target.apply(thisArg, args);
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct
   *
   * Caveat here is that `new.target` will not work
   */
  static construct(
    target: Function,
    argumentsList: unknown[],
    newTarget: Function = target
  ) {
    const obj = Object.create(target.prototype);
    return newTarget.apply(obj, argumentsList);
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/defineProperty
   */
  static defineProperty(
    target: AnyObject,
    propertyKey: string,
    attributes: AnyObject
  ) {
    validateTarget(target, "defineProperty");

    if (typeof attributes !== "object") {
      throw new TypeError(
        "Non-object passed as attributes of Reflect.defineProperty"
      );
    }

    try {
      Object.defineProperty(target, propertyKey, attributes);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/deleteProperty
   */
  static deleteProperty(target: AnyObject, property: string) {
    validateTarget(target, "deleteProperty");

    try {
      return delete target[property as keyof typeof target];
    } catch (_) {
      return false;
    }
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/get
   *
   * No support for `receiver`
   */
  static get(target: AnyObject, property: string) {
    validateTarget(target, "get");

    try {
      return target[property as keyof typeof target];
    } catch (_) {
      return false;
    }
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/getOwnPropertyDescriptor
   */
  static getOwnPropertyDescriptor(target: AnyObject, property: string) {
    validateTarget(target, "getOwnPropertyDescriptor");

    return Object.getOwnPropertyDescriptor(target, property);
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/getPrototypeOf
   */
  static getPrototypeOf(target: AnyObject) {
    validateTarget(target, "getPrototypeOf");
    return Object.getPrototypeOf(target);
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/has
   */
  static has(target: AnyObject, property: string) {
    validateTarget(target, "has");
    return property in target;
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/isExtensible
   */
  static isExtensible(target: AnyObject) {
    validateTarget(target, "isExtensible");
    return Object.isExtensible(target);
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/ownKeys
   */
  static ownKeys(target: AnyObject): (string | symbol)[] {
    validateTarget(target, "ownKeys");
    return [
      ...Object.getOwnPropertyNames(target),
      ...Object.getOwnPropertySymbols(target),
    ];
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/preventExtensions
   */
  static preventExtensions(target: AnyObject) {
    validateTarget(target, "preventExtensions");
    Object.preventExtensions(target);
    return !Object.isExtensible(target);
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/set
   *
   * No support for `receiver`
   */
  static set(target: AnyObject, property: string, value: unknown) {
    validateTarget(target, "set");

    try {
      target[property as keyof typeof target] = value;
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Implements https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Reflect/setPrototypeOf
   */
  static setPrototypeOf(target: AnyObject, prototype: AnyObject | null) {
    validateTarget(target, "setPrototypeOf");
    if (typeof prototype !== "object") {
      throw new TypeError(
        "Non-object prototype passed to Reflect.setPrototypeOf"
      );
    }
    try {
      Object.setPrototypeOf(target, prototype);
      return true;
    } catch (_) {
      return false;
    }
  }

  static getMetadata(metadataKey: any, target: any): any;
  static getMetadata(
    metadataKey: any,
    target: any,
    propertyKey: string | symbol
  ): any;
  static getMetadata(
    metadataKey: any,
    target: any,
    propertyKey?: string | symbol
  ): any {
    if (propertyKey !== undefined) {
      return MSReflect.getMetadata(metadataKey, target, propertyKey);
    }
    return MSReflect.getMetadata(metadataKey, target);
  }
}
