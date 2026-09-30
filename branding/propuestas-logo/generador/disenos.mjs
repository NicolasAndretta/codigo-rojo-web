// Propuestas de logo Código Rojo para la línea hombre / mujer.
// 4 conceptos x 2 variantes: el @ adentro del parche y afuera.
import * as L from "./lib.mjs";

const { FONTS, W, H, f2, polar } = L;

// Hilos: base / brillo / sombra.
export const T = {
  black: { base: "#1c1c1c", hi: "#343434", lo: "#0b0b0b" },
  red: { base: "#D3262F", hi: "#F0504F", lo: "#8A111A" },
  deep: { base: "#A01A26", hi: "#C23845", lo: "#5E0B14" },
  pink: { base: "#F3A8C2", hi: "#FBCADB", lo: "#D98BA8" },
  rose: { base: "#DC6F8F", hi: "#F097B0", lo: "#A5405F" },
  white: { base: "#EFEAE4", hi: "#FFFFFF", lo: "#BDB5AD" },
};

const HANDLE = "@codigorojo.oficial";
const TAGLINE = "TU ESTILO, BAJO CONTROL.";

function baseDefs() {
  let d = L.fabricDefs();
  for (const [k, c] of Object.entries(T)) {
    d += L.satinPattern(`sat_${k}`, c);
    d += L.satinPattern(`satS_${k}`, { ...c, pitch: 1.6, angle: -18 });
    d += L.tatamiPattern(`tat_${k}`, c);
  }
  d += L.puffFilter("puffXL", { blur: 3.4, scale: 3.4, shBlur: 2.4, shDx: 2, shDy: 3.5, shOp: 0.85, disp: 1.6, seed: 3 });
  d += L.puffFilter("puffM", { blur: 1.5, scale: 2.6, shBlur: 1.3, shDx: 1.1, shDy: 1.8, shOp: 0.75, disp: 1, seed: 9 });
  d += L.puffFilter("puffS", { blur: 0.9, scale: 2.2, shBlur: 0.9, shDx: 0.8, shDy: 1.3, shOp: 0.7, disp: 0.7, seed: 13 });
  d += L.puffFilter("puffRope", { blur: 3, scale: 3.2, spec: 0.02, shBlur: 2, shDx: 1.6, shDy: 2.8, shOp: 0.85, disp: 1.4, seed: 17 });
  d += L.puffFilter("puffMer", { blur: 4, scale: 3.6, spec: 0.02, shBlur: 2, shDx: 1.5, shDy: 2.5, shOp: 0.8, disp: 1.2, seed: 19 });
  d += L.puffFilter("puffFill", { blur: 4, scale: 2.2, spec: 0, shBlur: 0.1, shDx: 0, shDy: 0, shOp: 0, disp: 0.8, fuzz: 0.35, seed: 23 });
  return d;
}

// División hombre / mujer. A = lado "hombre" (izquierda).
// tiltDeg: inclinación de la línea respecto de la vertical (positivo = arriba a la derecha).
function makeSplit(cx, cy, tiltDeg = 0) {
  const t = (tiltDeg * Math.PI) / 180;
  const d = [Math.sin(t), -Math.cos(t)];
  const n = [Math.cos(t), Math.sin(t)];
  const P = (s, m) => `${f2(cx + s * d[0] + m * n[0])},${f2(cy + s * d[1] + m * n[1])}`;
  const big = 4000;
  return {
    inA: (x, y) => (x - cx) * n[0] + (y - cy) * n[1] < 0,
    polyA: `${P(big, 0)} ${P(-big, 0)} ${P(-big, -big)} ${P(big, -big)}`,
    polyB: `${P(big, 0)} ${P(-big, 0)} ${P(-big, big)} ${P(big, big)}`,
  };
}

function maskDef(id, inner) {
  return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff"/><g fill="#000">${inner}</g></mask>`;
}

// Estructura del parche: fondo, base partida, borde, líneas y cordón.
function core(o) {
  const cx = 540;
  const cy = o.handleInside ? 675 : 615;
  const R = 410;
  const split = makeSplit(cx, cy, o.tilt || 0);
  const side = (a) => (split.inA(...polar(cx, cy, 100, a)) ? "A" : "B");
  const pick = (spec) => (a) => T[side(a) === "A" ? spec.A : spec.B];
  const ctx = { cx, cy, R, defs: baseDefs(), body: L.fabricBg() };
  ctx.defs += `<clipPath id="clipA"><polygon points="${split.polyA}"/></clipPath><clipPath id="clipB"><polygon points="${split.polyB}"/></clipPath>`;

  ctx.body += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#000" filter="url(#patchShadow)"/>`;
  ctx.body += `<g filter="url(#puffFill)">
  <circle cx="${cx}" cy="${cy}" r="${R - 4}" fill="url(#tat_${o.field.A})" clip-path="url(#clipA)"/>
  <circle cx="${cx}" cy="${cy}" r="${R - 4}" fill="url(#tat_${o.field.B})" clip-path="url(#clipB)"/>
</g>`;

  const mer = L.stitchRing("mer", cx, cy, R - (o.merrowW || 24), R, { colorAt: pick(o.merrow), slantDeg: 1.2 });
  ctx.defs += mer.defs;
  ctx.body += `<g filter="url(#puffMer)">${mer.body}</g>`;

  (o.lines || []).forEach((ln, i) => {
    const s = L.stitchRing(`ln${i}`, cx, cy, R - ln.at - ln.w, R - ln.at, { colorAt: pick(ln), slantDeg: 2.5, tube: 0.35 });
    ctx.defs += s.defs;
    ctx.body += `<g filter="url(#puffS)">${s.body}</g>`;
  });

  if (o.rope) {
    const rp = L.rope("rp", cx, cy, R - o.rope.at - o.rope.w, R - o.rope.at, { n: o.rope.n || 60, colorAt: pick(o.rope) });
    ctx.defs += rp.defs;
    ctx.body += `<g filter="url(#puffRope)">${rp.body}</g>`;
  }
  return ctx;
}

// Elemento de dos hilos: color A de un lado de la división y B del otro.
// El filtro va sobre el conjunto para que la costura no marque un borde falso.
function twoTone(inner, A, B, filter, mask, pattern = "sat") {
  const m = mask ? ` mask="url(#${mask})"` : "";
  return `<g filter="url(#${filter})"><g${m}>
  <g fill="url(#${pattern}_${A})" clip-path="url(#clipA)">${inner}</g>
  <g fill="url(#${pattern}_${B})" clip-path="url(#clipB)">${inner}</g>
</g></g>`;
}

// Wordmark con los cortes de las O del logo actual.
function wordmark(ctx, { baseline, width, A, B, tracking = 2 }) {
  const font = FONTS.bc700;
  const probe = L.text(font, "CÓDIGO ROJO", 100, ctx.cx, baseline, { tracking });
  const size = (100 * width) / probe.width;
  const t = L.text(font, "CÓDIGO ROJO", size, ctx.cx, baseline, { tracking: (tracking * size) / 100 });
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
  ctx.defs += maskDef("wmCuts", cuts);
  ctx.body += twoTone(`<path d="${t.d}"/>`, A, B, "puffXL", "wmCuts");
}

function line(ctx, str, { font, size, baseline, A, B, tracking = 0 }) {
  const t = L.text(font, str, size, ctx.cx, baseline, { tracking });
  ctx.body += twoTone(`<path d="${t.d}"/>`, A, B, "puffS", null, "satS");
}

function arc(ctx, str, { font, size, r, center, bottom = false, A, B, tracking = 0, filter = "puffS", pattern = "satS" }) {
  const t = L.arcText(font, str, size, ctx.cx, ctx.cy, r, center, { tracking, bottom });
  ctx.body += twoTone(t.svg, A, B, filter, null, pattern);
}

function star(cx, cy, r, rot = -90) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.42;
    const a = ((rot + i * 36) * Math.PI) / 180;
    pts.push(`${f2(cx + rr * Math.cos(a))},${f2(cy + rr * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(" ")}"/>`;
}

// @ afuera: bordado directo sobre la prenda, debajo del parche.
function handleOutside(ctx, { color = "red", curved = false, size = 46 } = {}) {
  const { cx, cy, R } = ctx;
  if (curved) {
    // Abajo el texto crece hacia el centro: la línea de base queda por fuera del parche.
    const t = L.arcText(FONTS.mont600, HANDLE, size, cx, cy, R + 46 + size * 0.75, 90, { tracking: 2, bottom: true });
    ctx.body += `<g filter="url(#puffM)"><g fill="url(#sat_${color})">${t.svg}</g></g>`;
    return;
  }
  const t = L.text(FONTS.mont600, HANDLE, size, cx, cy + R + 112, { tracking: 1 });
  ctx.body += `<g filter="url(#puffM)"><path d="${t.d}" fill="url(#sat_${color})"/></g>`;
}

function finish(ctx) {
  ctx.body += `<rect width="${W}" height="${H}" fill="url(#vign)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${ctx.defs}</defs>${ctx.body}</svg>`;
}

// ------------------------------------------------------------ 1. MITADES
// La referencia, afinada: mitad negra (hombre) / mitad rosa (mujer), cordón
// de dos colores y el wordmark rojo cruzando las dos mitades.
function mitades({ handleInside }) {
  const ctx = core({
    handleInside,
    field: { A: "black", B: "pink" },
    merrow: { A: "black", B: "black" },
    lines: [
      { at: 28, w: 6, A: "red", B: "red" },
      { at: 102, w: 6, A: "red", B: "red" },
    ],
    rope: { at: 40, w: 54, n: 58, A: "red", B: "rose" },
  });
  const base = ctx.cy + (handleInside ? 4 : 22);
  wordmark(ctx, { baseline: base, width: 540, A: "red", B: "red" });
  line(ctx, TAGLINE, { font: FONTS.bc600, size: 34, baseline: base + 58, A: "white", B: "black", tracking: 2.2 });
  if (handleInside) {
    line(ctx, HANDLE, { font: FONTS.mont600, size: 27, baseline: base + 150, A: "pink", B: "deep", tracking: 0.6 });
  } else {
    handleOutside(ctx, { color: "red" });
  }
  return finish(ctx);
}

// ------------------------------------------------------ 2. HOMBRE ★ MUJER
// Insignia con la palabra de cada lado: HOMBRE sobre la mitad negra, MUJER
// sobre la rosa. La más explícita de las cuatro.
function hombreMujer({ handleInside }) {
  const labels = { A: "white", B: "black" };
  const ctx = core({
    handleInside,
    field: { A: "black", B: "pink" },
    merrow: { A: "red", B: "red" },
    merrowW: 22,
    lines: [{ at: 92, w: 7, A: "red", B: "red" }],
  });
  const { cx, cy, R } = ctx;
  const bandIn = R - 92;
  const bandOut = R - 22;
  const capTop = 30;
  const topR = bandIn + (bandOut - bandIn - capTop) / 2;
  const botR = bandOut - (bandOut - bandIn - capTop) / 2;
  const lab = { font: FONTS.bc700, size: 43, tracking: 7, filter: "puffM", pattern: "sat" };
  const sep = 13; // grados entre cada palabra y la estrella
  const span = (word) => (L.layout(lab.font, word, lab.size, lab.tracking).width / topR) * (180 / Math.PI);
  arc(ctx, "HOMBRE", { ...lab, r: topR, center: -90 - sep - span("HOMBRE") / 2, ...labels });
  arc(ctx, "MUJER", { ...lab, r: topR, center: -90 + sep + span("MUJER") / 2, ...labels });
  const [sx, sy] = polar(cx, cy, topR + capTop / 2, -Math.PI / 2);
  ctx.body += `<g filter="url(#puffS)"><g fill="url(#satS_red)">${star(sx, sy, 15)}</g></g>`;
  // Puntos a los costados, cerrando la franja.
  for (const a of [180, 0]) {
    const [px, py] = polar(cx, cy, (bandIn + bandOut) / 2, (a * Math.PI) / 180);
    ctx.body += `<g filter="url(#puffS)"><circle cx="${f2(px)}" cy="${f2(py)}" r="7" fill="url(#satS_red)"/></g>`;
  }
  if (handleInside) {
    arc(ctx, HANDLE, { font: FONTS.mont600, size: 30, r: botR - 4, center: 90, bottom: true, tracking: 2.5, ...labels });
    const base = cy + 30;
    wordmark(ctx, { baseline: base, width: 520, A: "red", B: "deep" });
    line(ctx, TAGLINE, { font: FONTS.bc600, size: 34, baseline: base + 60, A: "white", B: "black", tracking: 2.2 });
  } else {
    arc(ctx, TAGLINE, { font: FONTS.bc600, size: 38, r: botR, center: 90, bottom: true, tracking: 4.5, ...labels });
    wordmark(ctx, { baseline: cy + 44, width: 535, A: "red", B: "deep" });
    handleOutside(ctx, { color: "red" });
  }
  return finish(ctx);
}

// ---------------------------------------------------------------- 3. EL CORTE
// La división en diagonal: más movimiento, más streetwear. Sin cordón y con el
// wordmark más grande. (Sin línea roja sobre el corte a propósito: un círculo
// con una diagonal roja se lee como señal de "prohibido".)
function elCorte({ handleInside }) {
  const ctx = core({
    handleInside,
    tilt: 24,
    field: { A: "black", B: "pink" },
    merrow: { A: "black", B: "black" },
    lines: [{ at: 32, w: 7, A: "red", B: "red" }],
  });
  const base = ctx.cy + (handleInside ? 10 : 34);
  wordmark(ctx, { baseline: base, width: 610, A: "red", B: "deep" });
  line(ctx, TAGLINE, { font: FONTS.bc600, size: 38, baseline: base + 66, A: "white", B: "black", tracking: 2.6 });
  if (handleInside) {
    line(ctx, HANDLE, { font: FONTS.mont600, size: 30, baseline: base + 175, A: "pink", B: "deep", tracking: 0.8 });
  } else {
    handleOutside(ctx, { color: "red", curved: true, size: 44 });
  }
  return finish(ctx);
}

// ------------------------------------------------------------------- 4. CRUCE
// Cada mitad lleva el color de la otra en las letras, y el borde y el cordón
// rojos abrazan a las dos: el rojo es lo que las une.
function cruce({ handleInside }) {
  const ctx = core({
    handleInside,
    field: { A: "black", B: "pink" },
    merrow: { A: "red", B: "red" },
    rope: { at: 36, w: 52, n: 58, A: "red", B: "red" },
  });
  const base = ctx.cy + (handleInside ? 4 : 22);
  wordmark(ctx, { baseline: base, width: 560, A: "pink", B: "black" });
  line(ctx, TAGLINE, { font: FONTS.bc600, size: 34, baseline: base + 58, A: "pink", B: "black", tracking: 2.2 });
  if (handleInside) {
    arc(ctx, HANDLE, { font: FONTS.mont600, size: 27, r: ctx.R - 118, center: 90, bottom: true, tracking: 2, A: "pink", B: "black" });
  } else {
    handleOutside(ctx, { color: "pink" });
  }
  return finish(ctx);
}

export const CONCEPTOS = [
  { key: "1-mitades", nombre: "1 · Mitades", bajada: "La referencia, afinada", fn: mitades },
  { key: "2-hombre-mujer", nombre: "2 · Hombre ★ Mujer", bajada: "Lo dice con palabras", fn: hombreMujer },
  { key: "3-el-corte", nombre: "3 · El Corte", bajada: "División en diagonal", fn: elCorte },
  { key: "4-cruce", nombre: "4 · Cruce", bajada: "Cada mitad lleva el color de la otra", fn: cruce },
];
