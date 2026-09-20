/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Every key here becomes a new Tailwind class.
      // fontFamily.funky  ->  the class `font-funky`
      fontFamily: {
        funky: ['"Kalam"', 'cursive'],   // body / inputs / buttons
        logo: ['"Bangers"', 'cursive'],  // just the InkLink title
      },

      // borderWidth['3']  ->  the class `border-3`
      borderWidth: {
        3: '3px',
      },

      // borderRadius.wobbly-1 -> `rounded-wobbly-1`
      // These are asymmetric radii per corner: top-left/top-right/
      // bottom-right/bottom-left, so the shape reads as hand-drawn
      // instead of a perfect rounded rectangle.
      borderRadius: {
        'wobbly-1': '255px 15px 225px 15px / 15px 225px 15px 255px',
        'wobbly-2': '15px 255px 15px 225px / 225px 15px 255px 15px',
      },

      // boxShadow.ink -> `shadow-ink`
      // A hard, non-blurred offset shadow (no blur radius) is what
      // gives that "sticker/marker" pop instead of a soft drop shadow.
      boxShadow: {
        ink: '4px 4px 0px 0px #000',
        'ink-lg': '8px 8px 0px 0px #000',
      },
    },
  },
  plugins: [],
};