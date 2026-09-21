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
      keyframes: {
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.6) rotate(-6deg)' },
          '70%': { opacity: '1', transform: 'scale(1.06) rotate(1deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(1deg)' },
        },
        'bubble-in': {
          '0%': { opacity: '0', transform: 'translateY(6px) scale(0.9)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-3px) rotate(-2deg)' },
          '40%': { transform: 'translateX(3px) rotate(2deg)' },
          '60%': { transform: 'translateX(-2px) rotate(-1deg)' },
          '80%': { transform: 'translateX(2px) rotate(1deg)' },
        },
        'flash-green': {
          '0%': { backgroundColor: 'rgba(16,185,129,0.35)' },
          '100%': { backgroundColor: 'transparent' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-20px) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(220px) rotate(540deg)', opacity: '0' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'bubble-in': 'bubble-in 0.18s ease-out forwards',
        shake: 'shake 0.4s ease-in-out',
        'flash-green': 'flash-green 1s ease-out forwards',
        'confetti-fall': 'confetti-fall 1.8s ease-in forwards',
      },
    },
  },
  plugins: [],
};