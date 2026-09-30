// Máscaras de texto (blanco sobre transparente) para el render realista. La
// geometría sale del mismo motor que las propuestas (lib.mjs): mismas letras,
// mismo kerning y los mismos cortes en las "O".
//   node mascaras.mjs <spec.json> <carpeta-salida>
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import * as L from "../lib.mjs";

const [specFile, outDir] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
const { width: W, height: H, scale } = spec.canvas;
fs.mkdirSync(outDir, { recursive: true });

function wordmark(cx, baseline, width, tracking = 2) {
  const font = L.FONTS.bc700;
  const probe = L.text(font, "CÓDIGO ROJO", 100, cx, baseline, { tracking });
  const size = (100 * width) / probe.width;
  const t = L.text(font, "CÓDIGO ROJO", size, cx, baseline, { tracking: (tracking * size) / 100 });
  const cuts = L.oCuts(
    t.boxes,
    [
      { i: 1, pos: "top" },
      { i: 5, pos: "bottom" },
      { i: 8, pos: "top" },
      { i: 10, pos: "bottom" },
    ],
    { gap: size * 0.7 * 0.075 }
  );
  const mask = `<mask id="m" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000">${cuts}</g></mask>`;
  return `<defs>${mask}</defs><path d="${t.d}" fill="#fff" mask="url(#m)"/>`;
}

function element(el) {
  if (el.kind === "wordmark") return wordmark(el.cx, el.baseline, el.width);
  if (el.kind === "text") {
    const t = L.text(L.FONTS[el.font], el.str, el.size, el.cx, el.baseline, { tracking: el.tracking || 0 });
    return `<path d="${t.d}" fill="#fff"/>`;
  }
  if (el.kind === "arc") {
    const t = L.arcText(L.FONTS[el.font], el.str, el.size, el.cx, el.cy, el.r, el.center, {
      tracking: el.tracking || 0,
      bottom: Boolean(el.bottom),
    });
    return `<g fill="#fff">${t.svg}</g>`;
  }
  throw new Error(`tipo desconocido: ${el.kind}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
for (const el of spec.elements) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${element(el)}</svg>`;
  await page.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await page.screenshot({ path: path.join(outDir, `${el.name}.png`), omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
}
await browser.close();
console.log("máscaras:", spec.elements.map((e) => e.name).join(", "));
