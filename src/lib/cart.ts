import { useCallback, useEffect, useState } from "react";

/** item id -> quantity */
export type Cart = Record<string, number>;

const STORAGE_KEY = "makerspace-cart";

// Pure helpers (unit-tested) ------------------------------------------------

/** Adds one unit unless that would exceed `max`; returns null when it can't. */
export function addOne(cart: Cart, id: string, max: number): Cart | null {
  const current = cart[id] ?? 0;
  if (current >= max) return null;
  return { ...cart, [id]: current + 1 };
}

export function removeOne(cart: Cart, id: string): Cart {
  const next = { ...cart };
  if ((next[id] ?? 0) <= 1) delete next[id];
  else next[id] -= 1;
  return next;
}

export function removeItem(cart: Cart, id: string): Cart {
  const next = { ...cart };
  delete next[id];
  return next;
}

/** Joins the cart with catalog items, dropping unknown items and clamping to current stock. */
export function cartLines<T extends { id: string; quantity_available: number }>(cart: Cart, items: T[]) {
  const byId = new Map(items.map((i) => [i.id, i]));
  return Object.entries(cart).flatMap(([id, qty]) => {
    const item = byId.get(id);
    const clamped = item ? Math.min(qty, item.quantity_available) : 0;
    return item && clamped > 0 ? [{ item, qty: clamped }] : [];
  });
}

function readStored(): Cart {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, v]) => Number.isInteger(v) && (v as number) > 0),
    ) as Cart;
  } catch {
    return {};
  }
}

// Hook ------------------------------------------------------------------------

/**
 * Lending cart, kept in sessionStorage so it survives the sign-in redirect
 * (Google OAuth leaves and re-enters the app in the same tab).
 */
export function useCart() {
  const [cart, setCart] = useState<Cart>(readStored);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // Storage unavailable (private mode quota etc.): the cart still works in memory.
    }
  }, [cart]);

  /** Returns false if the item is already at its available quantity. */
  const add = useCallback((id: string, max: number): boolean => {
    const next = addOne(cart, id, max);
    if (next) setCart(next);
    return !!next;
  }, [cart]);

  const decrement = useCallback((id: string) => setCart((c) => removeOne(c, id)), []);
  const remove = useCallback((id: string) => setCart((c) => removeItem(c, id)), []);
  const clear = useCallback(() => setCart({}), []);

  return { cart, add, decrement, remove, clear };
}
