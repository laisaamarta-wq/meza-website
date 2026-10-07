// Payment adapter.
//
// The checkout UI only ever calls `submitOrder(order)` and reads the result.
// Today it runs in DEMO mode: the order is validated and stored in this browser,
// no money moves and nothing ships.
//
// To connect a real provider later, keep this function's contract and replace the
// demo branch with a server call. Typical flow (Stripe Checkout or Montonio, which is
// common for Baltic bank links):
//   1. POST the order (ids + quantities only — never prices from the client) to your
//      backend, which re-prices it and creates a payment session with the provider.
//   2. Redirect to the provider's hosted page with the returned session URL.
//   3. Confirm the order from the provider's webhook, not from the redirect.
//   4. Return { status: 'redirect', url } here and let the UI follow it.

export const PAYMENT_MODE = 'demo'; // 'demo' | 'provider'

export async function submitOrder(order) {
  if (PAYMENT_MODE === 'demo') {
    await new Promise(r => setTimeout(r, 1100)); // feels like a round trip, nothing is sent
    const ref = 'MZ-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const record = { ...order, ref, mode: 'demo', createdAt: new Date().toISOString() };
    try {
      const all = JSON.parse(localStorage.getItem('meza-demo-orders') || '[]');
      all.push(record); localStorage.setItem('meza-demo-orders', JSON.stringify(all.slice(-20)));
    } catch { /* storage unavailable: the confirmation still shows */ }
    return { status: 'demo', ref };
  }
  // provider mode — see the notes above
  const res = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: order.items.map(({ id, qty }) => ({ id, qty })), customer: order.customer, delivery: order.delivery }) });
  if (!res.ok) throw new Error('The payment service did not respond. Try again in a moment.');
  const { url } = await res.json();
  return { status: 'redirect', url };
}
