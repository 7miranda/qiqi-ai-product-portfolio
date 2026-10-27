// REQ-055 light theme: remaps the inherited dark-neon colours onto the v1.2 tokens at build time.
// The mapping is property-aware: a colour used for text is mapped on the text scale (light ink → dark ink, neon →
// a darker shade that keeps 4.5:1 on cream), a colour used for surfaces/borders on the surface scale (near-black →
// cream page, dark panel → white card, lines → #EADFC8, neon → the token). Glows are damped, shadows softened.

export const TOKENS = Object.freeze({
  page: '#FFF8EC', cream: '#FDF1D7', card: '#FFFFFF', line: '#EADFC8',
  primary: '#2FA36B', sun: '#FFC53D', coral: '#FF7A59', sky: '#4EA8E0',
  ink: '#22302A', ink2: '#5A6B62', note: '#7A8A82',
});
// Darker accent shades for text on cream (contrast ≥ 4.5:1).
const TEXT_ACCENT = { green: '#1E7A4E', blue: '#22689C', coral: '#C2462A', sun: '#8A5A00', purple: '#6A4FB8' };
const SURFACE_ACCENT = { green: TOKENS.primary, blue: TOKENS.sky, coral: TOKENS.coral, sun: TOKENS.sun, purple: '#8A6FD1' };

const hex2 = n => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
function parseHex(h) {
  let s = h.slice(1);
  if (s.length === 3 || s.length === 4) s = [...s].map(c => c + c).join('');
  return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16), a: s.length === 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1 };
}
function fromHex(h, a = 1) { const c = parseHex(h); return { ...c, a }; }
function format({ r, g, b, a }) {
  if (a >= 0.999) return `#${hex2(r)}${hex2(g)}${hex2(b)}`;
  return `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${+a.toFixed(3)})`;
}
function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
function fromHsl(h, s, l, a = 1) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255, a };
}
const mix = (a, b, t) => ({ r: a.r + (b.r - a.r) * t, g: a.g + (b.g - a.g) * t, b: a.b + (b.b - a.b) * t, a: a.a + (b.a - a.a) * t });
function ramp(stops, x) {
  if (x <= stops[0][0]) return fromHex(stops[0][1]);
  for (let i = 1; i < stops.length; i++) if (x <= stops[i][0]) {
    const [x0, c0] = stops[i - 1], [x1, c1] = stops[i];
    return mix(fromHex(c0), fromHex(c1), (x - x0) / (x1 - x0));
  }
  return fromHex(stops.at(-1)[1]);
}
function family(h) {
  if (h >= 65 && h < 160) return 'green';
  if (h >= 160 && h < 235) return 'blue';
  if (h >= 235 && h < 300) return 'purple';
  if (h >= 38 && h < 65) return 'sun';
  return 'coral';
}
// Original lightness → new neutral, by role.
const SURFACE = [[0.03, TOKENS.page], [0.07, TOKENS.card], [0.12, TOKENS.card], [0.18, '#F7EEDC'], [0.26, TOKENS.line], [0.4, '#C9BFA9'], [0.55, TOKENS.note], [0.7, TOKENS.ink2], [0.85, TOKENS.ink]];
const TEXT = [[0.3, TOKENS.card], [0.42, '#A99F8C'], [0.55, TOKENS.note], [0.7, TOKENS.ink2], [0.82, TOKENS.ink]];

export function mapColor(c, role) {
  const { h, s, l } = hsl(c);
  // Dark tones are surfaces whatever their tint (the old panels were dark teal); only mid tones carry an accent.
  // Light text was written for dark backgrounds, whatever its tint, so it becomes ink.
  const neutral = s < 0.35 || l < 0.22 || l > 0.94 || (role === 'text' && l > 0.8);
  if (role === 'shadow') {
    if (neutral) return { ...fromHex(TOKENS.ink), a: Math.min(0.12, c.a * 0.3) };
    const f = SURFACE_ACCENT[family(h)];
    return { ...fromHex(f), a: c.a * 0.18 }; // no neon glow (REQ-055 §动效克制)
  }
  if (neutral) {
    // Translucent white tints on dark become translucent ink tints on cream; translucent dark veils become cream veils.
    if (c.a < 0.999 && l > 0.85) return { ...fromHex(TOKENS.ink), a: Math.min(0.14, c.a * 1.6) };
    const out = ramp(role === 'text' ? TEXT : SURFACE, l);
    return { ...out, a: c.a };
  }
  const fam = family(h);
  const out = fromHex(role === 'text' ? TEXT_ACCENT[fam] : SURFACE_ACCENT[fam]);
  // Pale accent tints (e.g. #c9ff9f text, #e0ffc8) stay pale on surfaces: blend toward cream.
  if (role !== 'text' && l > 0.78) return { ...mix(out, fromHex(TOKENS.page), 0.72), a: c.a };
  return { ...out, a: c.a };
}

const NAMED = { white: '#ffffff', black: '#000000' };
const COLOR_RE = /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*(?:[,/]\s*[\d.]+%?\s*)?\)|\b(?:white|black)\b/g;
function parse(token) {
  if (token[0] === '#') return parseHex(token);
  if (NAMED[token]) return parseHex(NAMED[token]);
  const n = token.match(/[\d.]+%?/g).map(v => v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v));
  return { r: n[0], g: n[1], b: n[2], a: n[3] ?? 1 };
}
export function remapValue(value, role) {
  return value.replace(COLOR_RE, t => format(mapColor(parse(t), role)));
}
function roleFor(prop) {
  prop = prop.trim().toLowerCase();
  if (prop === 'color' || prop === '-webkit-text-fill-color' || prop === 'caret-color' || prop === 'text-decoration-color') return 'text';
  if (prop === 'box-shadow' || prop === 'text-shadow' || prop === 'filter' || prop === '-webkit-filter') return 'shadow';
  if (prop.startsWith('--')) return /ink|muted|text|fg|fore/.test(prop) ? 'text' : /shadow|glow/.test(prop) ? 'shadow' : 'surface';
  return 'surface';
}
// Rewrites every declaration block; selectors, at-rules and keyframe offsets are left as they are.
// Type scale (REQ-053 P2 / REQ-055): notes never below 13px (13px stays a note), 14px body copy goes to 15px.
const fontPx = n => n < 13 ? 13 : n > 13 && n < 15 ? 15 : n;
function shape(prop, value) {
  const p = prop.toLowerCase();
  if (p === 'color-scheme') return ' light';
  if (p === 'font-size') return value.replace(/(\d*\.?\d+)px/g, (m, n) => fontPx(+n) + 'px');
  if (p === 'font') return remapValue(value.replace(/(^|\s)(\d*\.?\d+)px/, (m, sp, n) => sp + fontPx(+n) + 'px'), 'text');
  // Cut corners go; everything is rounded (cards 20px).
  if (p === 'clip-path' && value.includes('--cut')) return 'none';
  if (p === 'border-radius') return value.replace(/(\d*\.?\d+)px/g, (m, n) => (+n >= 6 && +n <= 18 ? 20 : +n) + 'px');
  return remapValue(value, roleFor(prop));
}
export function themeCss(css) {
  return css.replace(/\{([^{}]*)\}/g, (all, body) => '{' + body.replace(/(^|;)(\s*)([-\w]+)(\s*:)([^;]*)/g, (m, sep, ws, prop, colon, value) =>
    sep + ws + prop + colon + shape(prop, value)) + '}');
}
// Campus building materials: keep their light/dark modelling, but warm and lift them onto a sunny palette.
export function warmMaterial(hex) {
  const c = parseHex(hex), { h, s, l } = hsl(c);
  if (s > 0.45 && l > 0.25) return format(mapColor(c, 'surface'));
  const warmHue = (h > 180 && h < 260) ? 32 : h;
  return format(fromHsl(warmHue, Math.min(0.42, s * 0.6 + 0.18), 0.5 + l * 0.42));
}
