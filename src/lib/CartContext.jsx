import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'nemesis-cart-v1';

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }, [items]);

  const addItem = useCallback((item) => {
    setItems((prev) => {
      const matchKey = (i) =>
        i.jerseyId === item.jerseyId &&
        (i.customName || '') === (item.customName || '') &&
        (i.customNumber || '') === (item.customNumber || '') &&
        (i.font || '') === (item.font || '') &&
        (i.fontId || '') === (item.fontId || '') &&
        (i.colorName || '') === (item.colorName || '') &&
        Number(i.size || 0) === Number(item.size || 0) &&
        Number(i.curve || 0) === Number(item.curve || 0) &&
        Number(i.height || 0) === Number(item.height || 0) &&
        (i.shirtSize || '') === (item.shirtSize || '') &&
        (i.designKey || '') === (item.designKey || '') &&
        (i.front_image || '') === (item.front_image || '') &&
        (i.artwork_front || '') === (item.artwork_front || '') &&
        Boolean(i.static_display) === Boolean(item.static_display) &&
        JSON.stringify(i.nameStyle || {}) === JSON.stringify(item.nameStyle || {}) &&
        JSON.stringify(i.numberStyle || {}) === JSON.stringify(item.numberStyle || {}) &&
        (i.customFontUrl || '') === (item.customFontUrl || '') &&
        (i.customFontName || '') === (item.customFontName || '') &&
        (i.rendered_image_version || '') === (item.rendered_image_version || '') &&
        Number(i.letterSpacing || 0) === Number(item.letterSpacing || 0);
      const existing = prev.find(matchKey);
      if (existing) {
        return prev.map((i) =>
          i === existing ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i
        );
      }
      return [...prev, { ...item, id: makeId(), quantity: item.quantity || 1 }];
    });
  }, []);

  const removeItem = useCallback((lineId) => {
    setItems((prev) => prev.filter((i) => i.id !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId, qty) => {
    setItems((prev) =>
      prev.map((i) => (i.id === lineId ? { ...i, quantity: Math.max(1, qty) } : i))
    );
  }, []);

  const editItem = useCallback((lineId, item) => {
    setItems((prev) =>
      prev.map((i) => (i.id === lineId ? { ...item, id: lineId, quantity: item.quantity || 1 } : i))
    );
  }, []);

  const updateItems = useCallback((updates) => {
    const updatesById = new Map(updates.map(({ id, ...patch }) => [id, patch]));
    setItems((prev) => prev.map((item) =>
      updatesById.has(item.id) ? { ...item, ...updatesById.get(item.id) } : item
    ));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, editItem, updateItems, clearCart, count, total }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}