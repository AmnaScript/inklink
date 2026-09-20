/**
 * A CSS-only stand-in for the colorful scribble background, so you don't
 * depend on finding/hosting the right image file.
 *
 * How it works: an SVG with a handful of squiggly <path>s in different
 * colors, repeated as a background-image tile. Tailwind's arbitrary-value
 * syntax lets you drop a full data: URI straight into a class.
 *
 * Usage: replace the `style={{ backgroundImage: ... }}` on your root div
 * in Home.tsx with just this className, and delete the doodleBackground
 * import entirely.
 */

export const scribbleBackgroundClass = `
  bg-[#faf8f5]
  bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cg fill='none' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M20 40 Q40 10 60 40 T100 40' stroke='%23a78bfa'/%3E%3Cpath d='M180 60 Q200 20 220 60 T260 60' stroke='%23f472b6'/%3E%3Cpath d='M40 180 Q60 140 80 180 T120 180' stroke='%2360a5fa'/%3E%3Cpath d='M200 220 Q220 190 240 220 T280 220' stroke='%23fbbf24'/%3E%3Cpath d='M10 250 L40 230 M15 260 L45 245 M20 270 L50 258' stroke='%2334d399'/%3E%3Cpath d='M250 30 L270 50 M245 40 L268 60 M255 20 L275 40' stroke='%23f87171'/%3E%3C/g%3E%3C/svg%3E")]
  bg-repeat
`;