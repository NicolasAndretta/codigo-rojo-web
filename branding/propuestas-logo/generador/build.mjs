// Genera las 8 propuestas (1080x1350, JPG) y la lámina comparativa.
//   npm install && npm run build        -> JPGs en la carpeta de arriba
//   npm run build -- --hd               -> además PNG 2160x2700 y SVG en salida-hd/
// Si Playwright no encuentra su Chromium: `npx playwright install chromium`,
// o apuntar CHROMIUM_PATH a un Chromium/Chrome ya instalado.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { W, H } from "./lib.mjs";
import { CONCEPTOS } from "./disenos.mjs";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(DIR, "..");
const HD = path.join(DIR, "salida-hd");
const hd = process.argv.includes("--hd");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

// Se renderiza al doble y se achica en el navegador: la textura del hilo queda
// más limpia que renderizando directo a 1080.
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
if (hd) fs.mkdirSync(HD, { recursive: true });

for (const c of CONCEPTOS) {
  for (const donde of ["adentro", "afuera"]) {
    const name = `${c.key}-arroba-${donde}`;
    const svg = c.fn({ handleInside: donde === "adentro" });
    await page.setContent(`<!doctype html><html><body style="margin:0">${svg}</body></html>`);
    const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: W, height: H } });
    if (hd) {
      fs.writeFileSync(path.join(HD, `${name}.png`), png);
      fs.writeFileSync(path.join(HD, `${name}.svg`), svg);
    }
    const jpg = await page.evaluate(
      async ({ b64, w, h }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${b64}`;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const g = canvas.getContext("2d");
        g.imageSmoothingQuality = "high";
        g.drawImage(img, 0, 0, w, h);
        return canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
      },
      { b64: png.toString("base64"), w: W, h: H }
    );
    fs.writeFileSync(path.join(OUT, `${name}.jpg`), Buffer.from(jpg, "base64"));
    console.log("listo", name);
  }
}

// Lámina comparativa: conceptos en columnas, @ adentro / afuera en filas.
const b64 = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
const font = (f) => b64(path.join(DIR, "fuentes", f), "font/ttf");
const img = (name) => b64(path.join(OUT, `${name}.jpg`), "image/jpeg");
const fila = (donde) => CONCEPTOS.map((c) => `<img src="${img(`${c.key}-arroba-${donde}`)}"/>`).join("");
const html = `<!doctype html><html><head><style>
@font-face{font-family:BC;src:url(${font("BarlowCondensed-700.ttf")})}
@font-face{font-family:BC6;src:url(${font("BarlowCondensed-600.ttf")})}
@font-face{font-family:M;src:url(${font("Montserrat-500.ttf")})}
*{margin:0;box-sizing:border-box}
body{width:2000px;background:#070707;color:#f1ece6;font-family:M;padding:56px 56px 40px}
h1{font-family:BC;font-size:64px;letter-spacing:2px}
h1 span{color:#e0303a}
.sub{font-size:22px;color:#a8a29e;margin:6px 0 34px}
.grid{display:grid;grid-template-columns:150px repeat(4,1fr);gap:18px;align-items:center}
.col{font-family:BC;font-size:34px;letter-spacing:1px;line-height:1}
.col small{display:block;font-family:M;font-size:17px;letter-spacing:0;color:#a8a29e;margin-top:6px}
.row{font-family:BC6;font-size:28px;line-height:1.05;color:#f3a8c2}
img{width:100%;display:block;border-radius:10px}
.foot{margin-top:26px;font-size:17px;color:#78716c}
</style></head><body>
<h1>CÓDIGO <span>ROJO</span> · Propuestas de logo</h1>
<div class="sub">Hombre y mujer, estilo parche bordado. 4 ideas, cada una con el @ adentro y afuera del parche.</div>
<div class="grid">
<div></div>${CONCEPTOS.map((c) => `<div class="col">${c.nombre}<small>${c.bajada}</small></div>`).join("")}
<div class="row">@ adentro<br>del parche</div>${fila("adentro")}
<div class="row">@ afuera<br>del parche</div>${fila("afuera")}
</div>
<div class="foot">Negro = hombre · Rosa = mujer · Rojo = la marca, que une las dos mitades.</div>
</body></html>`;
const sheet = await browser.newPage({ viewport: { width: 2000, height: 1000 }, deviceScaleFactor: 1 });
await sheet.setContent(html);
await sheet.evaluate(() => document.fonts.ready);
await sheet.screenshot({ path: path.join(OUT, "comparativa.jpg"), type: "jpeg", quality: 88, fullPage: true });
console.log("listo comparativa");

await browser.close();
