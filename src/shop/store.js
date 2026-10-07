import { byId, SHIPPING, VAT_RATE } from '../data/products.js';

// Cart state. Kept in this browser only (localStorage) — nothing leaves the device.
const KEY = 'meza-cart-v1';
const listeners = new Set();
let items = load();

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter(i => byId(i.id) && i.qty > 0).map(i => ({ id: i.id, qty: Math.min(99, i.qty | 0) })) : [];
  } catch { return []; }
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage unavailable: cart lives for this visit */ } }
function emit(change) { save(); listeners.forEach(fn => fn(items, change)); }

export const cart = {
  get items() { return items.map(i => ({ ...i, product: byId(i.id) })); },
  count: () => items.reduce((n, i) => n + i.qty, 0),
  qty: id => items.find(i => i.id === id)?.qty || 0,
  add(id, qty = 1) {
    const it = items.find(i => i.id === id);
    if (it) it.qty = Math.min(99, it.qty + qty); else items.push({ id, qty: Math.min(99, qty) });
    emit({ type: 'add', id, qty });
  },
  set(id, qty) {
    if (qty <= 0) return cart.remove(id);
    const it = items.find(i => i.id === id); if (!it) return;
    it.qty = Math.min(99, qty); emit({ type: 'set', id, qty });
  },
  remove(id) { items = items.filter(i => i.id !== id); emit({ type: 'remove', id }); },
  clear() { items = []; emit({ type: 'clear' }); },
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
};

export function totals(methodId = 'locker') {
  const subtotal = cart.items.reduce((s, i) => s + i.product.price * i.qty, 0);
  const method = SHIPPING.methods.find(m => m.id === methodId) || SHIPPING.methods[0];
  const free = subtotal >= SHIPPING.freeFrom;
  const shipping = subtotal === 0 ? 0 : free ? 0 : method.price;
  const total = subtotal + shipping;
  return {
    subtotal, shipping, total, free,
    freeLeft: Math.max(0, SHIPPING.freeFrom - subtotal),
    vat: total - total / (1 + VAT_RATE),
    method,
  };
}
