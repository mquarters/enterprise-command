/**
 * Root Tailwind config for the local Vite dev harness.
 * Re-exports the shipped SDK token config (src/tokens/tailwind.config.js)
 * and pins `content` globs relative to this file so class purging works
 * regardless of where Vite/PostCSS is invoked from.
 * @type {import('tailwindcss').Config}
 */
const tokenConfig = require('./src/tokens/tailwind.config.js');

module.exports = {
  ...tokenConfig,
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
};
