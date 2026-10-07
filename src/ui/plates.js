import { PLATES } from '../data/images.js';

// Ingredient lenses: each round photo sits inside a slowly turning ring of its latin name and picking time.
// Photos load as the row approaches; a tap opens one lens to full width with its story and a link to the bottle.
export function mountPlates() {
  const list = document.querySelector('.ingr-list');
  const items = [...document.querySelectorAll('.ingr[data-plate]')];

  items.forEach((li, i) => {
    const svg = li.querySelector('.ln-ring');
    const ring = `${li.dataset.ring} · `.toUpperCase();
    svg.innerHTML = `<defs><path id="ln-p${i}" d="M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"/></defs>
      <circle class="ln-arc" cx="50" cy="50" r="40"/>
      <g class="ln-spin"><text><textPath href="#ln-p${i}" textLength="281" lengthAdjust="spacing"></textPath></text></g>`;
    svg.querySelector('textPath').textContent = ring;

    const btn = li.querySelector('.ln');
    btn.addEventListener('click', () => {
      const open = !li.classList.contains('open');
      items.forEach(o => { o.classList.toggle('open', o === li && open); o.querySelector('.ln').setAttribute('aria-expanded', o === li && open); });
      if (open) setTimeout(() => li.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
    });
  });

  const show = () => items.forEach((li, i) => {
    const img = li.querySelector('img');
    if (img.src) return;
    img.addEventListener('load', () => setTimeout(() => img.classList.add('is-in'), i * 90), { once: true });
    img.src = PLATES[li.dataset.plate].src;
  });
  const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); show(); } }, { rootMargin: '60% 0px' });
  if (list) io.observe(list);
  return { paintAll: show };
}
