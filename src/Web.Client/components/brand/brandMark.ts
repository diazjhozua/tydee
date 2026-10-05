/**
 * Single source of truth for the Tydee brand mark.
 *
 * The mark is the lucide `Coins` glyph (the same one the marketing header has
 * always used), drawn as scene geometry so both the on-screen `Logo` component
 * and the generated PWA icons render from one definition.
 */

/** Path geometry of the lucide `Coins` glyph, in a 24x24 viewBox. */
export const COINS_PATHS = [
  "M13.744 17.736a6 6 0 1 1-7.48-7.48",
  "M15 6h1v4",
  "m6.134 14.768.866-.5 2 3.464",
] as const;

/** The matching coin ring. */
export const COINS_CIRCLE = { cx: 16, cy: 8, r: 6 } as const;

/** Emerald stops mirroring the `.hero-gradient` utility, sampled to hex. */
export const BRAND_GRADIENT = ["#047857", "#059669", "#10b981"] as const;

/** Corner radius as a fraction of the tile, matching the `rounded-2xl` tile. */
const CORNER_RATIO = 0.22;

/**
 * Build a self-contained SVG string of the app icon tile: the emerald gradient
 * square with the white Coins stroke centered inside an OS-safe inset.
 *
 * Use a larger `paddingRatio` for the maskable variant so the mark survives
 * circular cropping, and `radiusRatio: 0` for it too — a maskable icon must be
 * full-bleed, since the OS applies its own mask and would expose transparent
 * corners.
 */
export function brandIconSvg({
  size,
  paddingRatio = 0.22,
  radiusRatio = CORNER_RATIO,
}: {
  size: number;
  paddingRatio?: number;
  radiusRatio?: number;
}): string {
  const markBox = size * (1 - 2 * paddingRatio);
  const scale = markBox / 24;
  const offset = (size - markBox) / 2;
  const radius = size * radiusRatio;

  const shapes = [
    ...COINS_PATHS.map((d) => `<path d="${d}" />`),
    `<circle cx="${COINS_CIRCLE.cx}" cy="${COINS_CIRCLE.cy}" r="${COINS_CIRCLE.r}" />`,
  ].join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<defs>
<linearGradient id="tile" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="${BRAND_GRADIENT[0]}" />
<stop offset="0.55" stop-color="${BRAND_GRADIENT[1]}" />
<stop offset="1" stop-color="${BRAND_GRADIENT[2]}" />
</linearGradient>
</defs>
<rect width="${size}" height="${size}" rx="${radius}" fill="url(#tile)" />
<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes}</g>
</svg>`;
}

/** Encode the mark as a data URI for `ImageResponse`'s `<img>` source. */
export function brandIconDataUri(opts: {
  size: number;
  paddingRatio?: number;
  radiusRatio?: number;
}): string {
  return `data:image/svg+xml;base64,${Buffer.from(brandIconSvg(opts)).toString("base64")}`;
}