# Photographic plates — prompts and briefs

The forest worlds and ingredient plates are painted in code today. Real photography
will lift them further. Each world needs three transparent layers; drop them in
`public/plates/` and point `src/data/photos.js` at them. The scene keeps its parallax,
wind, focus pulls and transitions.

Shared direction for every image: real Baltic nature photographed beautifully.
Dark, low-key, muted. Deep shadows, soft atmospheric depth, slight haze. No saturated
greens, no fantasy plants, no impossible berries, no surreal light. Shot on a full-frame
camera with a fast lens; natural light only. Leave the centre of the frame quiet:
that is where the bottle stands.

Negative prompt for all: oversaturated, HDR, fantasy, glowing plants, surreal, illustration,
3D render, cartoon, plastic look, lens flare overload, people, text, watermark.

---

## World 01 — Sea buckthorn · dune forest, golden hour (Gulf of Riga)

**far** — Scots pine forest at the edge of coastal dunes, Latvia, late August, golden hour seen from inside the forest. Tall orange-barked pine trunks receding into warm haze, low sun behind the trees, dune grass on a sandy rise. Muted amber and brown, deep shadow, shallow depth, background fully out of focus. Wide 16:9.

**mid** — Closer pine trunks with warm rim light on one side, marram grass and yellow tansy on a dune slope, evening haze. Isolated on transparent background where the sky would be. Muted, cinematic.

**near** — Sea buckthorn branches heavy with orange berries and silver-green narrow leaves entering from the left and right edges of the frame, backlit by low sun so the berries glow. Centre of frame empty. Macro product-photography quality, shallow depth of field. Transparent background.

## World 02 — Blackcurrant leaf · birch wood after rain, June

**far** — Young birch forest in Latvia after rain, early June, soft overcast light, mist between white trunks, deep green canopy. Very muted, cool, quiet. Out of focus.

**mid** — Birch trunks with black markings, ferns on the forest floor, wet light. Transparent where sky shows.

**near** — Blackcurrant bush leaves with raindrops and a few hanging black berries entering from the frame edges. Dew beads catching soft light. Centre empty. Transparent background.

## World 03 — Juniper & bog myrtle · raised bog, blue hour (Ķemeri)

**far** — Raised bog in Latvia at blue hour: flat horizon of distant spruce, low ground fog, cold pale light low in the sky. Muted blue-grey, very dark foreground.

**mid** — Open bog plain with small dark pools holding the sky, stunted crooked pines, cotton grass. Transparent where sky shows.

**near** — Common juniper sprigs with dusty blue berries and bog myrtle leaves entering from the frame edges, cold light. Centre empty. Transparent background.

## World 04 — Rhubarb & wild rose · garden edge at dusk

**far** — Edge of a spruce forest at dusk behind an old Latvian garden, dusky pink light low on the horizon, mist. Muted, dark.

**mid** — Large rhubarb leaves with red stalks and dark rose thickets in the garden, dusk light. Transparent where sky shows.

**near** — Rosa rugosa branches with pink flowers and red-orange hips entering from the frame edges, dusk backlight. Centre empty. Transparent background.

## World 05 — The spring · Gauja valley, Sigulda

**far** — Red Devonian sandstone cliff of the Gauja river valley near Sigulda at dusk, pines on top, mist over the river. Muted terracotta and deep green.

**mid** — The dark Gauja river surface holding the last light, reeds at the banks. Transparent above the water line.

**near** — Fern fronds and pine boughs framing the corners. Centre empty. Transparent background.

---

## Ingredient plates (full-bleed, 3:2 or 16:10)

1. **Sea buckthorn** — Macro of a sea buckthorn branch dense with orange berries, backlit at golden hour, dark background with soft amber bokeh, narrow silver leaves. Editorial food photography, low-key.
2. **Wildflower honey** — Macro of capped honeycomb with a slow drip of honey, yarrow and clover out of focus behind, warm low light, deep shadows.
3. **Blackcurrant leaf** — Macro of a single blackcurrant leaf with raindrops, a raceme of black berries hanging behind it, cool green low-key light.
4. **Juniper berry** — Macro of juniper berries with natural dusty bloom on a sprig, cold blue-hour light, raised bog out of focus.
5. **Wild rose hip** — Macro of glossy red rose hips with a fading Rosa rugosa flower, dusk backlight, dark background.

## Optional short video loops (use only if they look real)

- 6–8 s: wind moving through dune grass at golden hour, locked-off camera, no people.
- 6–8 s: slow mist drifting over a raised bog at blue hour.
- 6–8 s: the Gauja river surface at dusk, gentle current, sandstone reflection.

Keep loops under 2 MB (1280 px, H.265/WebM). A good still with parallax beats an artificial-looking loop.

---

## Generated set in use (October 2026)

All 14 images on the site were generated with GPT Image 2.5 (Higgsfield), then converted to WebP.
They live in `src/assets/img/` and are wired up in `src/data/images.js`.

| File | Settings | Use |
|---|---|---|
| plate-buckthorn / honey / currant / juniper / rose | 16:9, high, 2K | Ingredient plates |
| world-buckthorn / currant / juniper / rhubarb / spring | 16:9, medium, 2K | Background behind the bottle in each world |
| cut-buckthorn / currant / juniper / rose | 3:2, medium, 2K, transparent background | Branches framing each scene, fly-through pieces, footer |

The plate prompts follow one pattern: *photorealistic macro → the fruit described as plump, glossy,
with dew and natural texture → subject on the side opposite the copy, dark blurred bokeh on the other →
low warm (or cool) backlight, low-key, muted, nothing oversaturated → 100 mm macro, f/2.8, film grain.*
To replace one image, regenerate it with the same aspect ratio, export WebP, and overwrite the file.
