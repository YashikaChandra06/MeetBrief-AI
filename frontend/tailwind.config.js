/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          DEFAULT: '#123C2F',
          dark: '#0B2B22',
          emerald: '#167D55',
          light: '#1e5443',
          hover: '#194738',
        },
        sage: {
          DEFAULT: '#E5F0E9',
          light: '#F2F7F4',
          border: '#E1EAE4',
          subtle: '#EDF5F0',
        },
        offwhite: '#F7FAF8',
        brand: {
          text: '#18352B',
          muted: '#718078',
          border: '#E1EAE4',
          success: '#168653',
          warning: '#D99B35',
          error: '#D9534F',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(18, 60, 47, 0.05)',
        'card': '0 4px 20px -2px rgba(18, 60, 47, 0.08)',
        'card-hover': '0 10px 25px -4px rgba(18, 60, 47, 0.12)',
      }
    },
  },
  plugins: [],
}

