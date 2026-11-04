"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type CartItem = {
  productId: number;
  variantId: number;
  name: string;
  size: string;
  price: number;
  /**
   * Precio pagando por transferencia, al momento de agregarlo (migración 012).
   * Solo para mostrar: el servidor recalcula al crear el pedido. Los carritos
   * armados antes no lo tienen, y el checkout lo estima con el % de la tienda.
   */
  priceTransfer?: number;
  image: string | null;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  /** true cuando ya se leyó el carrito guardado. Antes, `items` vacío no significa nada. */
  hydrated: boolean;
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number, variantId: number) => void;
  updateQuantity: (productId: number, variantId: number, quantity: number) => void;
  clearCart: () => void;
};

const CART_KEY = "cr_cart";

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  // false hasta leer localStorage. Sin esto, recargar /checkout lo mandaba al
  // carrito: el checkout veía la lista vacía del primer render (los efectos de
  // los hijos corren antes que el de acá) y creía que no había nada.
  const [hydrated, setHydrated] = useState(false);

  // Hidratación desde localStorage: sólo puede correr en cliente (no existe
  // en SSR), por eso va en un effect. El setState inicial es intencional.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(load());
    setHydrated(true);
  }, []);

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find(
          (i) => i.productId === item.productId && i.variantId === item.variantId
        );
        const next = existing
          ? prev.map((i) =>
              i.productId === item.productId && i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + quantity }
                : i
            )
          : [...prev, { ...item, quantity }];
        save(next);
        return next;
      });
    },
    []
  );

  const removeItem = useCallback((productId: number, variantId: number) => {
    setItems((prev) => {
      const next = prev.filter(
        (i) => !(i.productId === productId && i.variantId === variantId)
      );
      save(next);
      return next;
    });
  }, []);

  const updateQuantity = useCallback(
    (productId: number, variantId: number, quantity: number) => {
      if (quantity <= 0) {
        removeItem(productId, variantId);
        return;
      }
      setItems((prev) => {
        const next = prev.map((i) =>
          i.productId === productId && i.variantId === variantId
            ? { ...i, quantity }
            : i
        );
        save(next);
        return next;
      });
    },
    [removeItem]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_KEY);
  }, []);

  return (
    <CartContext.Provider
      value={{ items, hydrated, totalItems, totalPrice, addItem, removeItem, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
