/**
 * Identidade visual Papelito — Guia de Marca 2025 (pasta REBRANDING/MANUAL):
 *  - Cores principais: amarelo #FCD930 (70%) · preto #231F20 (30%)
 *  - Secundárias: marrom #3C1F0B · branco · amarelo-limão #FDE62F · mel #FFC943 ·
 *    verde #10A958 · laranja #FF6019 · rosa #FF25B7 · lilás #AE69FF
 *  - Tipografia: Beastly (títulos, caixa alta) → na web, Ultra (indicada pelo guia);
 *    PP Neue Montreal (texto corrido; licenciada) → substituta gratuita Inter Tight
 * @type {import('tailwindcss').Config}
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PP Neue Montreal"', 'neueMontreal', '"Inter Tight"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Beastly', 'Ultra', '"Rockwell Bold"', 'Rockwell', 'serif'],
      },
      colors: {
        ink: { DEFAULT: '#231F20', soft: '#3A3536', muted: '#6B6566' },
        paper: { DEFAULT: '#FBF9F2', line: '#E9E4D6' },
        brand: {
          50: '#FFFBE6', 100: '#FEF4BF', 200: '#FDE98A', 300: '#FDE62F', 400: '#FCDD4F',
          500: '#FCD930', 600: '#E3C21B', 700: '#5E4F00', 800: '#3C1F0B', 900: '#231F20',
        },
        honey: '#FFC943',
        cocoa: '#3C1F0B',
        leaf: '#10A958',
        flame: '#FF6019',
        pink: '#FF25B7',
        lilac: '#AE69FF',
        accent: { 400: '#FF8A55', 500: '#FF6019', 600: '#D94A0A' },
      },
      borderRadius: { md: '2px', lg: '3px', xl: '4px', '2xl': '6px' },
      boxShadow: { card: '0 1px 0 rgba(35,31,32,0.06)' },
    },
  },
  plugins: [],
};
