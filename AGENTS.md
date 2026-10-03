# Instructions for Qwen
You are a decisive, highly accurate assistant. When processing your thoughts:
- Do not use phrases like "Wait," "Let me rethink," "Hold on," or "Is that right?".
- Trust your first principles and follow a direct, linear path to the solution.
- Only correct your course if you encounter a definitive mathematical or logical contradiction, not out of generalized doubt.
- Maintain a confident, analytical tone in your internal reasoning.


# Vantage UI

A React 19 + Vite + Tailwind 3 UI SDK for a Domain-Driven Command Center Platform.
Read `ui-vantage-blueprint.md` (architecture) and `starting-prompt.md` (intent and
specs) before building components.

## Layout

- Everything lives in `packages/ui-sdk`, inside an npm workspace. Install and run
  `npm run dev` / `npm run typecheck` from the **repo root**. Run Playwright scripts
  from the repo root or `packages/ui-sdk`; there is a single hoisted `node_modules` at the root.
- `src/App.tsx` is the preview app; `src/main.tsx` mounts it. `src/mocks` holds mock data.
- `src/tokens` has the design tokens (`variables.css`, `domain-component.css`,
  `tailwind.css`). Use the tokens, not raw colors or spacing.

## Commands (from the repo root)

- `npm run dev` starts Vite (config: `packages/ui-sdk/vite.config.ts`, which
  enables `@vitejs/plugin-react` and dedupes react/react-dom). It serves on
  http://localhost:5173 (it picks the next port if that one is taken; read the log).
- `npm run typecheck` runs `tsc --noEmit`. Run it before saying a change is done.

## Checking the UI in a browser (Playwright)

Verify visual changes in a real browser. Do not claim a UI change works from reading
code alone.

1. Start the dev server in the background: `npm run dev &`, then read the URL from its output.
2. Run a script from the repo root by piping it to node (`node - <<'EOF' ... EOF`), so
   `require('playwright')` resolves from the current directory. A script file saved in
   `/tmp` will not find it. Don't put scripts in `src/`:

   ```js
   const { chromium } = require('playwright');
   (async () => {
     const browser = await chromium.launch();           // headless
     const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
     const errors = [];
     page.on('console', m => m.type() === 'error' && errors.push(m.text()));
     page.on('pageerror', e => errors.push(String(e)));
     await page.goto('http://localhost:5173');
     await page.waitForSelector('#root > *');
     await page.screenshot({ path: '/tmp/ui.png', fullPage: true });
     console.log(errors.length ? errors : 'no console errors');
     await browser.close();
   })();
   ```

3. Look at the screenshot with the Read tool, and report any console errors.
4. Stop the dev server when done.

Chromium and its headless shell are already installed. If launch fails with
`Executable doesn't exist`, tell the user; do not try to download browsers.

## Conventions

- Components follow the blueprint's tiers: L1 (NOC wall), L2 (triage drawer),
  L3 (SRE workbench). Keep L1 legible on a wall display.
- Components take the enriched polymorphic payload as props. They do not compute health
  or blast radius themselves.
- Don't commit `dist/`, `node_modules/` or `.env`.
