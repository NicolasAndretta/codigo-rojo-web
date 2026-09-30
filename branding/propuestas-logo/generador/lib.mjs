// Motor de parches "bordados" en SVG: texto a curvas (opentype.js), texturas
// de puntada, cordón trenzado, borde overlock y relieve con luz (filtros SVG).
// Todo sale como SVG autocontenido: el texto va convertido a curvas, así que
// no depende de tener las fuentes instaladas para verlo.
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const load = (f) => opentype.loadSync(path.join(DIR, "fuentes", f));

export const FONTS = {
  bc600: load("BarlowCondensed-600.ttf"),
  bc700: load("BarlowCondensed-700.ttf"),
  mont600: load("Montserrat-600.ttf"),
};

// Lienzo 4:5 (el formato de posteo de Instagram).
export const W = 1080;
export const H = 1350;

export const f2 = (n) => Number(n.toFixed(2));
const rad = (d) => (d * Math.PI) / 180;
export const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

// ------------------------------------------------------------------- texto
export function layout(font, str, size, tracking = 0) {
  const glyphs = font.stringToGlyphs(str, { features: { liga: false, rlig: false } });
  const scale = size / font.unitsPerEm;
  let x = 0;
  const out = [];
  glyphs.forEach((g, i) => {
    const adv = g.advanceWidth * scale;
    out.push({ g, x, adv, ch: str[i] });
    x += adv;
    if (i < glyphs.length - 1) x += font.getKerningValue(g, glyphs[i + 1]) * scale + tracking;
  });
  return { glyphs: out, width: x };
}

// Texto recto. Devuelve el path y la caja de cada glifo (para los cortes de las O).
export function text(font, str, size, cx, baseline, { tracking = 0 } = {}) {
  const L = layout(font, str, size, tracking);
  const x0 = cx - L.width / 2;
  let d = "";
  const boxes = [];
  for (const it of L.glyphs) {
    const p = it.g.getPath(x0 + it.x, baseline, size);
    d += p.toPathData(2);
    boxes.push({ ch: it.ch, bb: p.getBoundingBox() });
  }
  return { d, width: L.width, boxes };
}

// Texto sobre un arco: cada glifo rota rígido, apoyado en rBase.
// bottom=true: se lee de izquierda a derecha por la parte de abajo, derecho.
export function arcText(font, str, size, cx, cy, rBase, centerDeg, { tracking = 0, bottom = false } = {}) {
  const L = layout(font, str, size, tracking);
  const parts = [];
  for (const it of L.glyphs) {
    const s = it.x + it.adv / 2 - L.width / 2;
    const th = rad(centerDeg) + (bottom ? -s / rBase : s / rBase);
    const [px, py] = polar(cx, cy, rBase, th);
    const rot = (th * 180) / Math.PI + (bottom ? -90 : 90);
    const d = it.g.getPath(-it.adv / 2, 0, size).toPathData(2);
    if (d) parts.push(`<path d="${d}" transform="translate(${f2(px)} ${f2(py)}) rotate(${f2(rot)})"/>`);
  }
  return { svg: parts.join(""), width: L.width };
}

// ---------------------------------------------------------------- texturas
// Puntada satinada: hilos paralelos, con leve variación de brillo entre hilos.
export function satinPattern(id, { base, hi, lo, pitch = 2.3, angle = -22 }) {
  const alphas = [0.55, 0.35, 0.7, 0.45, 0.6, 0.3, 0.5];
  const h = f2(pitch * alphas.length);
  let s = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="60" height="${h}" patternTransform="rotate(${angle})">`;
  s += `<rect width="60" height="${h}" fill="${base}"/>`;
  alphas.forEach((a, k) => {
    const y = k * pitch;
    s += `<rect y="${f2(y)}" width="60" height="${f2(pitch * 0.42)}" fill="${hi}" opacity="${a}"/>`;
    s += `<rect y="${f2(y + pitch * 0.78)}" width="60" height="${f2(pitch * 0.22)}" fill="${lo}" opacity="0.8"/>`;
  });
  return s + "</pattern>";
}

// Relleno tatami: filas de puntadas largas con la penetración escalonada.
export function tatamiPattern(id, { base, hi, lo, row = 2.6, stitch = 17, angle = 35 }) {
  const offs = [0, 0.43, 0.81, 0.27, 0.64, 0.12, 0.52, 0.9];
  const hgt = f2(row * offs.length);
  const dash = `${f2(stitch - 0.9)} 0.9`;
  let s = `<pattern id="${id}" patternUnits="userSpaceOnUse" width="${stitch}" height="${hgt}" patternTransform="rotate(${angle})">`;
  s += `<rect width="${stitch}" height="${hgt}" fill="${lo}"/>`;
  offs.forEach((o, k) => {
    const y = k * row + row / 2;
    const off = f2(o * stitch);
    s += `<line x1="${-2 * stitch}" y1="${f2(y)}" x2="${3 * stitch}" y2="${f2(y)}" stroke="${base}" stroke-width="${f2(row * 0.9)}" stroke-dasharray="${dash}" stroke-dashoffset="${off}"/>`;
    s += `<line x1="${-2 * stitch}" y1="${f2(y - row * 0.2)}" x2="${3 * stitch}" y2="${f2(y - row * 0.2)}" stroke="${hi}" stroke-width="${f2(row * 0.2)}" stroke-dasharray="${dash}" stroke-dashoffset="${off}" opacity="${k % 2 ? 0.25 : 0.4}"/>`;
  });
  return s + "</pattern>";
}

// ----------------------------------------------------------------- filtros
// Relieve de hilo: borde apenas irregular, volumen con luz difusa desde arriba
// a la izquierda, pelusa de fibra y sombra de caída sobre la tela.
export function puffFilter(id, o = {}) {
  const {
    blur = 2, scale = 3.2, el = 58, az = 225, k = 1.16, spec = 0.08, specExp = 30,
    shBlur = 1.6, shDx = 1.2, shDy = 2.2, shOp = 0.75, disp = 1.2, fuzz = 0.5, seed = 5,
  } = o;
  const g = f2(1 - fuzz / 2);
  return `<filter id="${id}" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${seed}" result="nz"/>
  <feDisplacementMap in="SourceGraphic" in2="nz" scale="${disp}" xChannelSelector="R" yChannelSelector="G" result="src"/>
  <feColorMatrix in="src" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="srcA"/>
  <feGaussianBlur in="srcA" stdDeviation="${blur}" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="${scale}" diffuseConstant="1" lighting-color="#fff" result="d"><feDistantLight azimuth="${az}" elevation="${el}"/></feDiffuseLighting>
  <feSpecularLighting in="h" surfaceScale="${scale}" specularConstant="1" specularExponent="${specExp}" lighting-color="#fff" result="s"><feDistantLight azimuth="${az}" elevation="${el}"/></feSpecularLighting>
  <feComponentTransfer in="s" result="s1"><feFuncA type="linear" slope="1.7" intercept="-0.7"/></feComponentTransfer>
  <feComposite in="s1" in2="srcA" operator="in" result="s2"/>
  <feComposite in="src" in2="d" operator="arithmetic" k1="${k}" result="lit"/>
  <feColorMatrix in="nz" type="matrix" values="${fuzz} 0 0 0 ${g}  ${fuzz} 0 0 0 ${g}  ${fuzz} 0 0 0 ${g}  0 0 0 0 1" result="fib"/>
  <feComposite in="lit" in2="fib" operator="arithmetic" k1="1" result="lit1"/>
  <feComposite in="lit1" in2="s2" operator="arithmetic" k2="1" k3="${spec}" result="lit2"/>
  <feComposite in="lit2" in2="srcA" operator="in" result="body"/>
  <feGaussianBlur in="srcA" stdDeviation="${shBlur}" result="sb"/>
  <feOffset in="sb" dx="${shDx}" dy="${shDy}" result="so"/>
  <feComponentTransfer in="so" result="shadow"><feFuncA type="linear" slope="${shOp}"/></feComponentTransfer>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="body"/></feMerge>
</filter>`;
}

// Fondo: frisa negra (como un buzo), con una luz suave y viñeta.
export function fabricDefs() {
  return `<filter id="fleece" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="11"/>
  <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.85 0 0 0 -0.36"/>
</filter>
<filter id="fleeceLow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="0.006 0.012" numOctaves="3" seed="4"/>
  <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0 0 0 -0.42"/>
</filter>
<radialGradient id="spot" cx="0.45" cy="0.36" r="0.75">
  <stop offset="0" stop-color="#fff" stop-opacity="0.07"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/>
</radialGradient>
<radialGradient id="vign" cx="0.5" cy="0.47" r="0.78">
  <stop offset="0.55" stop-color="#000" stop-opacity="0"/>
  <stop offset="1" stop-color="#000" stop-opacity="0.75"/>
</radialGradient>
<filter id="patchShadow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feGaussianBlur in="SourceAlpha" stdDeviation="14"/><feOffset dx="3" dy="12"/>
  <feComponentTransfer><feFuncA type="linear" slope="0.95"/></feComponentTransfer>
</filter>`;
}

export function fabricBg() {
  return `<rect width="${W}" height="${H}" fill="#080808"/>
<rect width="${W}" height="${H}" filter="url(#fleeceLow)" opacity="0.1"/>
<rect width="${W}" height="${H}" filter="url(#fleece)" opacity="0.3"/>
<rect width="${W}" height="${H}" fill="url(#spot)"/>`;
}

// ------------------------------------------------------------------ piezas
export function ringPath(cx, cy, r1, r2) {
  const c = (r) => `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0Z`;
  return c(r2) + c(r1);
}

function sectorRing(cx, cy, r1, r2, a0, a1) {
  const [x0, y0] = polar(cx, cy, r2, a0);
  const [x1, y1] = polar(cx, cy, r2, a1);
  const [x2, y2] = polar(cx, cy, r1, a1);
  const [x3, y3] = polar(cx, cy, r1, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${f2(x0)},${f2(y0)}A${r2},${r2} 0 ${large},1 ${f2(x1)},${f2(y1)}L${f2(x2)},${f2(y2)}A${r1},${r1} 0 ${large},0 ${f2(x3)},${f2(y3)}Z`;
}

// Cordón trenzado entre r1 y r2. colorAt(ángulo) => { base, hi, lo }.
export function rope(id, cx, cy, r1, r2, { n = 66, twist = 1.45, colorAt }) {
  const dA = (2 * Math.PI) / n;
  const S = twist * dA;
  const K = 16;
  const edge = (i, t) => i * dA + (t - 0.5) * S;
  const tuckAt = (t) => dA * 0.3 * (1 - Math.pow(Math.sin(Math.PI * t), 0.6));
  const rm = (r1 + r2) / 2;
  const pts = (list) => list.map(([x, y]) => `${f2(x)},${f2(y)}`).join(" ");
  let defs = "";
  let base = "";
  let strands = "";
  for (let i = 0; i < n; i++) {
    const c = colorAt(edge(i + 0.5, 0.5));
    base += `<path d="${sectorRing(cx, cy, r1 - 1, r2 + 1, i * dA - dA * 0.02, (i + 1.04) * dA)}" fill="${c.lo}"/>`;
    const a0 = (t) => edge(i, t) + dA * 0.03 + tuckAt(t);
    const a1 = (t) => edge(i + 1, t) + dA * 0.06 - tuckAt(t);
    const left = [];
    const right = [];
    for (let k = 0; k <= K; k++) {
      const t = k / K;
      const r = r1 + t * (r2 - r1);
      left.push(polar(cx, cy, r, a0(t)));
      right.push(polar(cx, cy, r, a1(t)));
    }
    // Degradé a lo ancho de la hebra: bordes oscuros, centro con brillo suave.
    const [ax, ay] = polar(cx, cy, rm, edge(i, 0.5));
    const [bx, by] = polar(cx, cy, rm, edge(i + 1, 0.5));
    defs += `<linearGradient id="${id}g${i}" gradientUnits="userSpaceOnUse" x1="${f2(ax)}" y1="${f2(ay)}" x2="${f2(bx)}" y2="${f2(by)}">
<stop offset="0.02" stop-color="${c.lo}"/><stop offset="0.3" stop-color="${c.base}"/><stop offset="0.5" stop-color="${c.hi}"/><stop offset="0.75" stop-color="${c.base}"/><stop offset="1" stop-color="${c.lo}"/></linearGradient>`;
    strands += `<polygon points="${pts(left.concat(right.reverse()))}" fill="url(#${id}g${i})"/>`;
    // Hilos satinados a lo largo de la hebra.
    [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach((fr, j) => {
      const line = [];
      for (let k = 1; k < K; k++) {
        const t = k / K;
        line.push(polar(cx, cy, r1 + t * (r2 - r1), a0(t) + fr * (a1(t) - a0(t))));
      }
      const light = j % 2 === 0;
      strands += `<polyline points="${pts(line)}" fill="none" stroke="${light ? "#fff" : "#000"}" stroke-opacity="${light ? 0.16 : 0.14}" stroke-width="0.9"/>`;
    });
  }
  // Volumen de tubo: se oscurece hacia los dos bordes del cordón.
  const at = (f) => f2((r1 + (r2 - r1) * f) / r2);
  defs += `<radialGradient id="${id}tube" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r2}">
<stop offset="${at(0)}" stop-color="#000" stop-opacity="0.6"/><stop offset="${at(0.3)}" stop-color="#000" stop-opacity="0.08"/>
<stop offset="${at(0.55)}" stop-color="#000" stop-opacity="0"/><stop offset="${at(0.8)}" stop-color="#000" stop-opacity="0.12"/>
<stop offset="1" stop-color="#000" stop-opacity="0.6"/></radialGradient>
<clipPath id="${id}clip"><path d="${ringPath(cx, cy, r1, r2)}" clip-rule="evenodd"/></clipPath>`;
  const body = `<g clip-path="url(#${id}clip)">${base}${strands}<path d="${ringPath(cx, cy, r1, r2)}" fill-rule="evenodd" fill="url(#${id}tube)"/></g>`;
  return { defs, body };
}

// Borde overlock (merrow) o línea satinada circular: puntadas radiales inclinadas.
export function stitchRing(id, cx, cy, rIn, rOut, { colorAt, slantDeg = 1.1, tube = 0.55 }) {
  const count = Math.round((2 * Math.PI * rOut) / 2.6);
  const wStitch = f2(((2 * Math.PI * rOut) / count) * 0.72);
  let stitches = "";
  for (let k = 0; k < count; k++) {
    const a = (k / count) * 2 * Math.PI;
    const c = colorAt(a);
    const [x1, y1] = polar(cx, cy, rIn, a);
    const [x2, y2] = polar(cx, cy, rOut, a + rad(slantDeg));
    stitches += `<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${k % 3 === 0 ? c.hi : c.base}" stroke-width="${wStitch}"/>`;
  }
  // Base (para que no se vea el fondo entre puntadas), de a sectores de color.
  let base = "";
  const seg = 180;
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * 2 * Math.PI;
    const a1 = ((k + 1.05) / seg) * 2 * Math.PI;
    base += `<path d="${sectorRing(cx, cy, rIn, rOut, a0, a1)}" fill="${colorAt((a0 + a1) / 2).lo}"/>`;
  }
  const defs = `<radialGradient id="${id}tube" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${rOut}">
<stop offset="${f2(rIn / rOut)}" stop-color="#000" stop-opacity="${tube}"/>
<stop offset="${f2((rIn + (rOut - rIn) * 0.45) / rOut)}" stop-color="#000" stop-opacity="0"/>
<stop offset="1" stop-color="#000" stop-opacity="${tube}"/></radialGradient>
<clipPath id="${id}clip"><path d="${ringPath(cx, cy, rIn, rOut)}" clip-rule="evenodd"/></clipPath>`;
  const body = `<g clip-path="url(#${id}clip)">${base}${stitches}<path d="${ringPath(cx, cy, rIn, rOut)}" fill-rule="evenodd" fill="url(#${id}tube)"/></g>`;
  return { defs, body };
}

// Cortes diagonales de las "O" (el ADN del logo actual).
// which: lista de { i: índice de glifo, pos: 'top' | 'bottom' }.
export function oCuts(boxes, which, { gap, angleDeg = -34 }) {
  let s = "";
  for (const { i, pos } of which) {
    const b = boxes[i].bb;
    const w = b.x2 - b.x1;
    const h = b.y2 - b.y1;
    // En la Ó la caja incluye el acento: medir solo la O.
    const oTop = boxes[i].ch === "Ó" ? b.y2 - h * 0.8 : b.y1;
    const oh = b.y2 - oTop;
    // El corte atraviesa la O entera: arriba entra por la derecha (como el
    // acento), abajo sale por la izquierda. Largo justo para no tocar vecinas.
    const cx = b.x1 + w * 0.5;
    const cy = oTop + oh * (pos === "top" ? 0.3 : 0.72);
    const len = w * 1.25;
    s += `<rect x="${f2(cx - len / 2)}" y="${f2(cy - gap / 2)}" width="${f2(len)}" height="${f2(gap)}" transform="rotate(${angleDeg} ${f2(cx)} ${f2(cy)})"/>`;
  }
  return s;
}
