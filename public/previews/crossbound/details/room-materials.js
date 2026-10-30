// Shared industrial finish for the existing rooms. No geometry or operating rules change.
// Design handoff §6.4: floor #112329, walls #0f1d23, edge lines cyan; objects keep their own colours.
const tones = new Map([
  [0x0a1020, 0x03080b], [0x1e2636, 0x112329], [0x34405a, 0x1a3038], [0x2a3650, 0x0f1d23],
  [0x1a2232, 0x0c181d], [0x202a3c, 0x293e48], [0x2a3448, 0x405763],
  [0x223047, 0x324b55], [0x16202e, 0x20343d], [0x0b1020, 0x071218],
  [0x8a7dff, 0x6e9ca9], [0xff4fb3, 0x829fae], [0xffd34d, 0x97bdc2],
  [0xff9f43, 0x9aa999], [0x5dff9a, 0xa6ff32],
]);

export function industrialColor(color) {
  if (typeof color === 'number') return tones.get(color) ?? color;
  if (typeof color === 'string' && /^#[\da-f]{6}$/i.test(color)) {
    const tone = tones.get(Number.parseInt(color.slice(1), 16));
    if (tone !== undefined) return `#${tone.toString(16).padStart(6, '0')}`;
  }
  return color;
}
