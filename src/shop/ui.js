import { CATALOG, SHIPPING, byId, money } from '../data/products.js';
import { cart, totals } from './store.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
let images = {};
let ui = {};

// ---------- shop cards ----------
export function mountShop(onImagesNeeded) {
  const grid = $('#shopGrid');
  grid.innerHTML = CATALOG.map(p => {
    const f = p.mixed ? null : p;
    const style = f ? `--c-bg:${f.bg};--c-glow:${f.glow};--c-acc:${f.accent}` : '--c-bg:#0b0c0a;--c-glow:#6a5a40;--c-acc:#e8dcc0';
    const [title, sub] = p.mixed ? ['The mixed case', 'Three of each recipe'] : [p.short, p.name.replace(p.short, '').trim()];
    return `
    <article class="card${p.mixed ? ' card-wide' : ''}" data-id="${p.id}" style="${style}">
      <div class="card-art">
        <span class="card-no">Nº ${p.no}</span>
        <img alt="${esc(p.mixed ? 'Four Meža bottles, one of each recipe' : 'Meža Nº ' + p.no + ', ' + p.name)}" loading="lazy" hidden>
        <span class="card-skel" aria-hidden="true"></span>
      </div>
      <div class="card-body">
        <h3>${esc(title)}</h3>
        <p class="card-sub">${esc(sub)}</p>
        <p class="card-taste mono">${esc(p.taste)}</p>
        <div class="card-row"><span class="price">${money(p.price)}</span><span class="mono pack">${esc(p.pack)}</span></div>
        <div class="card-actions">
          <div class="qty" role="group" aria-label="Quantity">
            <button type="button" data-step="-1" aria-label="Fewer">−</button>
            <output aria-live="polite">1</output>
            <button type="button" data-step="1" aria-label="More">+</button>
          </div>
          <button type="button" class="btn add" data-magnetic>Add to cart</button>
        </div>
      </div>
    </article>`;
  }).join('');

  grid.addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return;
    const out = $('output', card);
    const step = e.target.closest('[data-step]');
    if (step) { out.textContent = Math.max(1, Math.min(24, +out.textContent + +step.dataset.step)); return; }
    const add = e.target.closest('.add');
    if (add) {
      cart.add(card.dataset.id, +out.textContent);
      out.textContent = '1';
      add.textContent = 'Added'; add.classList.add('is-added');
      clearTimeout(add._t); add._t = setTimeout(() => { add.textContent = 'Add to cart'; add.classList.remove('is-added'); }, 1400);
      toast(`${byId(card.dataset.id).short} added`, 'View cart', openCart);
    }
  });

  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); onImagesNeeded(); } }, { rootMargin: '120% 0px' });
  io.observe(grid);
}

export function setImages(map) {
  images = map;
  document.querySelectorAll('.card').forEach(card => {
    const src = map[card.dataset.id]; if (!src) return;
    const img = $('img', card); img.src = src; img.hidden = false; $('.card-skel', card)?.remove();
  });
  renderCart();
}

// ---------- toast ----------
function toast(text, action, fn) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(text)}</span>${action ? `<button type="button">${esc(action)}</button>` : ''}`;
  if (action) $('button', t).onclick = () => { t.classList.remove('show'); fn(); };
  t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 3200);
}

// ---------- cart drawer ----------
const thumb = id => images[id] ? `<img src="${images[id]}" alt="">` : '<span class="thumb-skel"></span>';

function renderCart() {
  const list = $('#cartList'), foot = $('#cartFoot'), n = cart.count();
  document.querySelectorAll('[data-cart-count]').forEach(el => (el.textContent = n));
  if (!n) {
    list.innerHTML = `<div class="cart-empty"><p>Your cart is empty.</p><p class="mono">Four recipes are waiting in the forest.</p><button type="button" class="btn ghost" data-go="shop">Browse the shop</button></div>`;
    foot.hidden = true; return;
  }
  foot.hidden = false;
  list.innerHTML = cart.items.map(({ id, qty, product: p }) => `
    <div class="line" data-id="${id}">
      <div class="line-thumb">${thumb(id)}</div>
      <div class="line-main">
        <div class="line-top"><strong>${esc(p.mixed ? 'Mixed case' : p.short)}</strong><span class="line-price">${money(p.price * qty)}</span></div>
        <span class="mono line-meta">Nº ${p.no} · ${esc(p.pack)}</span>
        <div class="line-ctrl">
          <div class="qty small" role="group" aria-label="Quantity for ${esc(p.short)}">
            <button type="button" data-q="-1" aria-label="Fewer">−</button><output>${qty}</output><button type="button" data-q="1" aria-label="More">+</button>
          </div>
          <button type="button" class="link" data-remove>Remove</button>
        </div>
      </div>
    </div>`).join('');
  const t = totals();
  $('#cartSubtotal').textContent = money(t.subtotal);
  $('#cartShip').textContent = t.free ? 'Free delivery' : `${money(t.freeLeft)} more for free delivery`;
  $('#cartBar').style.transform = `scaleX(${Math.min(1, t.subtotal / SHIPPING.freeFrom)})`;
}

export function openCart() {
  const d = $('#cart'); d.hidden = false;
  requestAnimationFrame(() => d.classList.add('open'));
  ui.lock?.(true);
  setTimeout(() => $('#cartClose').focus(), 50);
}
export function closeCart() {
  const d = $('#cart'); d.classList.remove('open');
  setTimeout(() => { d.hidden = true; }, 520);
  ui.lock?.(false);
}

export function mountCart(opts) {
  ui = opts;
  renderCart();
  cart.subscribe(() => { renderCart(); if (!$('#checkout').hidden) renderCheckout(); bump(); });
  document.querySelectorAll('[data-open-cart]').forEach(b => b.addEventListener('click', openCart));
  $('#cartClose').addEventListener('click', closeCart);
  $('#cartScrim').addEventListener('click', closeCart);
  $('#cartContinue').addEventListener('click', () => { closeCart(); });
  $('#cartCheckout').addEventListener('click', () => { closeCart(); openCheckout(); });
  $('#cartList').addEventListener('click', e => {
    const line = e.target.closest('.line');
    if (e.target.closest('[data-go]')) { closeCart(); ui.go?.(e.target.closest('[data-go]').dataset.go); return; }
    if (!line) return;
    const q = e.target.closest('[data-q]');
    if (q) cart.set(line.dataset.id, cart.qty(line.dataset.id) + +q.dataset.q);
    if (e.target.closest('[data-remove]')) cart.remove(line.dataset.id);
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#checkout').hidden) closeCheckout(); else if (!$('#cart').hidden) closeCart();
  });
  mountCheckout();
}

function bump() {
  document.querySelectorAll('.cart-btn').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); });
}

// ---------- checkout ----------
const co = { step: 1, method: 'locker', data: {}, busy: false, result: null };

export function openCheckout() {
  if (!cart.count()) { openCart(); return; }
  Object.assign(co, { step: 1, result: null, busy: false });
  const el = $('#checkout'); el.hidden = false;
  requestAnimationFrame(() => el.classList.add('open'));
  ui.lock?.(true);
  renderCheckout();
  setTimeout(() => $('#coClose').focus(), 60);
}
export function closeCheckout() {
  const el = $('#checkout'); el.classList.remove('open');
  setTimeout(() => { el.hidden = true; }, 520);
  ui.lock?.(false);
}

function summaryHTML(compact = false) {
  const t = totals(co.method);
  return `
    <div class="sum-lines">${cart.items.map(({ id, qty, product: p }) => `
      <div class="sum-line"><div class="line-thumb">${thumb(id)}</div><div><strong>${esc(p.mixed ? 'Mixed case' : p.short)}</strong><span class="mono">${qty} × ${esc(p.pack)}</span></div><span>${money(p.price * qty)}</span></div>`).join('')}
    </div>
    <dl class="sum-totals">
      <div><dt>Subtotal</dt><dd>${money(t.subtotal)}</dd></div>
      <div><dt>${esc(t.method.name)}</dt><dd>${t.shipping ? money(t.shipping) : 'Free'}</dd></div>
      <div class="sum-total"><dt>Total</dt><dd>${money(t.total)}</dd></div>
      ${compact ? '' : `<div class="sum-vat"><dt>Includes 21% VAT</dt><dd>${money(t.vat)}</dd></div>`}
    </dl>`;
}

function stepsHTML() {
  const names = ['Review', 'Details', 'Confirm'];
  return `<ol class="co-steps">${names.map((n, k) => `<li class="${co.step === k + 1 ? 'is-on' : co.step > k + 1 ? 'is-done' : ''}"><span class="mono">0${k + 1}</span>${n}</li>`).join('')}</ol>`;
}

function field(id, label, type = 'text', attrs = '', full = false) {
  const v = co.data[id] ?? '';
  return `<div class="field${full ? ' full' : ''}"><label for="co-${id}">${label}</label><input id="co-${id}" name="${id}" type="${type}" value="${esc(v)}" ${attrs}><span class="err" id="co-${id}-err" role="alert"></span></div>`;
}

function renderCheckout() {
  const body = $('#coBody'), side = $('#coSide');
  $('#coSteps').innerHTML = co.result ? '' : stepsHTML();
  side.innerHTML = co.result ? '' : `<h3 class="mono">Your order</h3>${summaryHTML()}`;
  side.hidden = !!co.result;

  if (co.result) {
    body.innerHTML = `
      <div class="co-done">
        <span class="eyebrow mono">Demo order received</span>
        <h2>Thank you, ${esc((co.data.name || '').split(' ')[0] || 'friend')}.</h2>
        <p>Your reference is <strong class="mono">${esc(co.result.ref)}</strong>.</p>
        <p class="co-note">This was a demo checkout. No payment was taken and nothing will be shipped. When a payment provider is connected, this step will confirm a real order.</p>
        <button type="button" class="btn" id="coBack">Back to Meža</button>
      </div>`;
    $('#coBack').onclick = closeCheckout;
    return;
  }

  if (co.step === 1) {
    body.innerHTML = `
      <h2>Review your case</h2>
      <div class="co-review">${cart.items.map(({ id, qty, product: p }) => `
        <div class="line" data-id="${id}">
          <div class="line-thumb">${thumb(id)}</div>
          <div class="line-main">
            <div class="line-top"><strong>${esc(p.mixed ? 'Mixed case' : p.name)}</strong><span class="line-price">${money(p.price * qty)}</span></div>
            <span class="mono line-meta">Nº ${p.no} · ${esc(p.pack)}</span>
            <div class="line-ctrl"><div class="qty small"><button type="button" data-q="-1" aria-label="Fewer">−</button><output>${qty}</output><button type="button" data-q="1" aria-label="More">+</button></div><button type="button" class="link" data-remove>Remove</button></div>
          </div>
        </div>`).join('')}
      </div>
      <fieldset class="co-delivery"><legend>Delivery</legend>
        ${SHIPPING.methods.map(m => `<label class="radio"><input type="radio" name="method" value="${m.id}" ${co.method === m.id ? 'checked' : ''}><span><strong>${esc(m.name)}</strong><span>${esc(m.detail)}</span></span><em>${totals(m.id).free ? 'Free' : money(m.price)}</em></label>`).join('')}
      </fieldset>
      <div class="co-actions"><button type="button" class="btn ghost" id="coKeep">Keep browsing</button><button type="button" class="btn" id="coNext1">Continue to details</button></div>`;
    body.querySelector('.co-review').addEventListener('click', e => {
      const line = e.target.closest('.line'); if (!line) return;
      const q = e.target.closest('[data-q]'); if (q) cart.set(line.dataset.id, cart.qty(line.dataset.id) + +q.dataset.q);
      if (e.target.closest('[data-remove]')) { cart.remove(line.dataset.id); if (!cart.count()) closeCheckout(); }
    });
    body.querySelectorAll('input[name=method]').forEach(i => i.addEventListener('change', () => { co.method = i.value; renderCheckout(); }));
    $('#coKeep').onclick = closeCheckout;
    $('#coNext1').onclick = () => { co.step = 2; renderCheckout(); $('#co-name')?.focus(); };
  }

  if (co.step === 2) {
    const locker = co.method === 'locker';
    body.innerHTML = `
      <h2>Your details</h2>
      <form id="coForm" class="co-form" novalidate>
        ${field('name', 'Full name', 'text', 'autocomplete="name" required', true)}
        ${field('email', 'Email', 'email', 'autocomplete="email" required')}
        ${field('phone', 'Phone', 'tel', 'autocomplete="tel" placeholder="+371 2000 0000" required')}
        ${locker ? `
        <div class="field full"><label for="co-locker">Parcel locker</label>
          <select id="co-locker" name="locker" required><option value="">Choose a locker</option>${SHIPPING.lockers.map(l => `<option ${co.data.locker === l ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
          <span class="err" id="co-locker-err" role="alert"></span></div>` : `
        ${field('address', 'Street address', 'text', 'autocomplete="street-address" required', true)}
        ${field('city', 'City', 'text', 'autocomplete="address-level2" required')}
        ${field('postcode', 'Postcode', 'text', 'autocomplete="postal-code" placeholder="LV-1050" required')}`}
        <div class="field full"><label for="co-notes">Note for the courier <span class="opt">optional</span></label><textarea id="co-notes" name="notes" rows="2">${esc(co.data.notes || '')}</textarea></div>
        <div class="co-actions full"><button type="button" class="btn ghost" id="coBack1">Back</button><button type="submit" class="btn">Review order</button></div>
      </form>`;
    $('#coBack1').onclick = () => { collect(); co.step = 1; renderCheckout(); };
    $('#coForm').addEventListener('submit', e => { e.preventDefault(); collect(); if (validate()) { co.step = 3; renderCheckout(); } });
  }

  if (co.step === 3) {
    const d = co.data, locker = co.method === 'locker';
    body.innerHTML = `
      <h2>Confirm your order</h2>
      <div class="co-confirm">
        <div><span class="mono">Contact</span><p>${esc(d.name)}<br>${esc(d.email)}<br>${esc(d.phone)}</p></div>
        <div><span class="mono">Delivery</span><p>${esc(totals(co.method).method.name)}<br>${locker ? esc(d.locker) : `${esc(d.address)}<br>${esc(d.postcode)} ${esc(d.city)}`}</p></div>
        <button type="button" class="link" id="coEdit">Edit details</button>
      </div>
      <div class="co-pay">
        <span class="mono">Payment</span>
        <p><strong>Demo checkout.</strong> No payment is taken here. In the live shop this step hands you to the payment provider to pay by card or bank link.</p>
      </div>
      <div class="co-mobile-sum">${summaryHTML(true)}</div>
      <div class="co-actions"><button type="button" class="btn ghost" id="coBack2">Back</button><button type="button" class="btn" id="coPlace">Place demo order · ${money(totals(co.method).total)}</button></div>
      <p class="err" id="coPlaceErr" role="alert"></p>`;
    $('#coEdit').onclick = $('#coBack2').onclick = () => { co.step = 2; renderCheckout(); };
    $('#coPlace').onclick = place;
  }
}

function collect() {
  const f = $('#coForm'); if (!f) return;
  new FormData(f).forEach((v, k) => (co.data[k] = String(v).trim()));
}

function validate() {
  const d = co.data, locker = co.method === 'locker';
  const rules = {
    name: [!!d.name && d.name.length > 1, 'Enter your full name.'],
    email: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || ''), 'Enter an email like name@example.com.'],
    phone: [/^\+?[\d\s-]{7,}$/.test(d.phone || ''), 'Enter a phone number, for example +371 2000 0000.'],
    ...(locker ? { locker: [!!d.locker, 'Choose a parcel locker.'] } : {
      address: [!!d.address, 'Enter the street and house number.'],
      city: [!!d.city, 'Enter the city.'],
      postcode: [/^(LV-?)?\d{4}$/i.test(d.postcode || ''), 'Enter a Latvian postcode, for example LV-1050.'],
    }),
  };
  let first = null;
  for (const [k, [ok, msg]] of Object.entries(rules)) {
    const err = $(`#co-${k}-err`), input = $(`#co-${k}`);
    if (err) err.textContent = ok ? '' : msg;
    input?.setAttribute('aria-invalid', ok ? 'false' : 'true');
    if (!ok && !first) first = input;
  }
  first?.focus();
  return !first;
}

async function place() {
  if (co.busy) return;
  co.busy = true;
  const btn = $('#coPlace'); btn.disabled = true; btn.textContent = 'Placing demo order…';
  const { submitOrder } = await import('./payment.js');
  const t = totals(co.method);
  try {
    const res = await submitOrder({
      items: cart.items.map(({ id, qty, product }) => ({ id, qty, price: product.price })),
      customer: { name: co.data.name, email: co.data.email, phone: co.data.phone },
      delivery: { method: co.method, locker: co.data.locker, address: co.data.address, city: co.data.city, postcode: co.data.postcode, notes: co.data.notes },
      totals: { subtotal: t.subtotal, shipping: t.shipping, total: t.total },
    });
    if (res.status === 'redirect') { location.href = res.url; return; }
    co.result = res; cart.clear(); renderCheckout();
  } catch (e) {
    $('#coPlaceErr').textContent = e.message; btn.disabled = false; btn.textContent = `Place demo order · ${money(t.total)}`;
  } finally { co.busy = false; }
}

function mountCheckout() {
  $('#coClose').addEventListener('click', closeCheckout);
}

