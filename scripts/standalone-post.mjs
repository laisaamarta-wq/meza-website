// Post-process the single-file build: move inlined photos out of the JS module into a plain JSON
// data block. The module stays small (fast to parse on phones and in-app previews); the photos
// are read by a tiny classic script before the module runs.
import { readFileSync, writeFileSync } from 'node:fs';
const file = process.argv[2] || 'dist-standalone/index.html';
let html = readFileSync(file, 'utf8');
const start = html.indexOf('<script type="module"');
const end = html.indexOf('</script>', start);
let js = html.slice(start, end);
const imgs = [];
js = js.replace(/(["'`])(data:image\/[a-z+]+;base64,[A-Za-z0-9+/=]+)\1/g, (_, q, uri) => {
  let i = imgs.indexOf(uri); if (i < 0) i = imgs.push(uri) - 1;
  return `window.__MZI[${i}]`;
});
const data = `<script type="application/json" id="mzi">${JSON.stringify(imgs)}</script>\n` +
  `<script>window.__MZI=[];try{window.__MZI=JSON.parse(document.getElementById('mzi').textContent)}catch(e){}</script>\n`;
html = html.slice(0, start) + data + js + html.slice(end);
writeFileSync(file, html);
console.log(`moved ${imgs.length} images (${(imgs.join('').length / 1024).toFixed(0)} KB) out of the module; module now ${(js.length / 1024).toFixed(0)} KB`);
