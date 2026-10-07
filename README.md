# Meža — sparkling botanical soda (concept site)

A small brand + shop site built around one real-time 3D bottle. Concept project: the shop and checkout run in demo mode, no real payments.

Deployed on Vercel from this repository (Vite preset: `npm run build`, output `dist/`). Every push to `main` redeploys.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173 — development
npm run build      # production build into dist/
npm run preview    # serves dist/ at http://localhost:4173
```

Node 18+ (tested on 22). Fonts are self-hosted, so the site works offline.

**Quickest way to look at it:** `npm run build:standalone` writes `dist-standalone/index.html`,
one self-contained file (about 1.5 MB) that opens with a double-click, no server needed.
`http://localhost:…` addresses only exist while `npm run dev` or `npm run preview`
is running on the same computer.

## The journey

DISCOVER → EXPERIENCE → TASTE → EXPLORE → SHOP → ORDER

| Section | What happens |
|---|---|
| Hero | Bottle Nº 01 in the dune forest at golden hour. “Shop Meža” jumps to the shop. |
| Product worlds | Scroll-driven: push-in, diagonal hero, macro shots on the label (sugar, botanical, crown), physical hand-off to the next bottle while the forest changes around the camera. Four worlds, then the range at the Gauja spring. |
| Ingredients | Five editorial plates (sea buckthorn, wildflower honey, blackcurrant leaf, juniper, rose hip), three parallax depths each. |
| Origin | The bottle returns at the spring; the story is told beside it. |
| Shop | Five products (four 6-packs, one mixed case) with images rendered from the same 3D bottles. |
| Cart | Slide-in drawer: quantities, remove, subtotal, free-delivery meter. |
| Checkout | Review → details (validated) → confirm → demo order with a reference number. |

## Where things live

```
src/data/products.js   flavours, prices, delivery, VAT — single source of truth
src/data/photos.js     optional photographic plates for the forest (see ASSET-PROMPTS.md)
src/scene/label.js     printed label + crown artwork
src/scene/bottle.js    glass, liquid shader, condensation, bubbles, light pool
src/scene/worlds.js    the five painted forest worlds and fly-through sprites
src/scene/forest.js    forest renderer: depth layers, wind, focus, particles, transitions
src/scene/stage.js     bottle renderer, lighting per world, product-shot renderer
src/scene/choreo.js    GSAP/ScrollTrigger timelines (product journey + origin)
src/ui/plates.js       ingredient plates
src/shop/              cart store, cart/checkout UI, payment adapter
```

## Connecting real payments

`src/shop/payment.js` is the only file the checkout talks to. It runs in `demo` mode:
no money moves, the order is stored in this browser only, and the UI says so.
The file documents the provider flow (Stripe Checkout or Montonio): re-price on a
server, redirect to the hosted payment page, confirm by webhook.

## Performance

- Loads the first forest and first bottle only; the rest are built when the browser is idle, in scroll order.
- The forest renders on its own canvas at reduced resolution (it is soft by design).
- Device tiers (high / mid / low) set pixel ratio, texture sizes, particles and bubbles.
- Resolution steps down automatically if frames run long; rendering stops when the 3D stage is covered or the tab is hidden.
- `prefers-reduced-motion`: static camera, no wind or particles, colour-only transitions, native scrolling.
