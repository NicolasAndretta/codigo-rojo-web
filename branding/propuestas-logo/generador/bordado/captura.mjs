// Captura una página HTML local entera como JPG (o PNG), esperando las fuentes.
//   node captura.mjs <pagina.html> <salida.jpg> [ancho]
import path from "node:path";
import { chromium } from "playwright";

const [file, out, width = "2400"] = process.argv.slice(2);
const jpg = out.endsWith(".jpg");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: Number(width), height: 1200 }, deviceScaleFactor: 1 });
await page.goto(`file://${path.resolve(file)}`, { waitUntil: "load" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out, fullPage: true, type: jpg ? "jpeg" : "png", ...(jpg ? { quality: 90 } : {}) });
await browser.close();
console.log("captura:", out);
