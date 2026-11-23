import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { addOne, cartLines, removeItem, removeOne, useCart } from "./cart";

describe("cart helpers", () => {
  it("adds up to the available quantity", () => {
    let cart = addOne({}, "a", 2)!;
    cart = addOne(cart, "a", 2)!;
    expect(cart).toEqual({ a: 2 });
    expect(addOne(cart, "a", 2)).toBeNull();
    expect(addOne({}, "b", 0)).toBeNull();
  });

  it("removes one unit, dropping the line at zero", () => {
    expect(removeOne({ a: 2 }, "a")).toEqual({ a: 1 });
    expect(removeOne({ a: 1 }, "a")).toEqual({});
    expect(removeItem({ a: 3, b: 1 }, "a")).toEqual({ b: 1 });
  });

  it("joins with items, dropping unknown/out-of-stock items and clamping to stock", () => {
    const items = [
      { id: "a", quantity_available: 1 },
      { id: "b", quantity_available: 0 },
    ];
    expect(cartLines({ a: 3, b: 1, gone: 2 }, items)).toEqual([{ item: items[0], qty: 1 }]);
  });
});

describe("useCart", () => {
  afterEach(() => sessionStorage.clear());

  it("persists to sessionStorage so the cart survives the sign-in redirect", () => {
    const first = renderHook(() => useCart());
    act(() => { first.result.current.add("a", 5); });
    act(() => { first.result.current.add("a", 5); });
    first.unmount();

    const second = renderHook(() => useCart());
    expect(second.result.current.cart).toEqual({ a: 2 });
    act(() => second.result.current.clear());
    expect(JSON.parse(sessionStorage.getItem("makerspace-cart")!)).toEqual({});
  });

  it("ignores corrupt stored data", () => {
    sessionStorage.setItem("makerspace-cart", '{"a":"lots","b":-1,"c":2}');
    expect(renderHook(() => useCart()).result.current.cart).toEqual({ c: 2 });
    sessionStorage.setItem("makerspace-cart", "not json");
    expect(renderHook(() => useCart()).result.current.cart).toEqual({});
  });

  it("refuses to exceed the available quantity", () => {
    const { result } = renderHook(() => useCart());
    let added = true;
    act(() => { added = result.current.add("a", 0); });
    expect(added).toBe(false);
    expect(result.current.cart).toEqual({});
  });
});
