# CoC Masters PL CWL Dashboard

A modern Clash of Clans statistics hub for the CoC Masters PL family. The site aggregates Clan War League data into family standings, clan deep dives, and a global player leaderboard so leaders can review performance at a glance.

## Family Clans

- 🏆 **coc masters PL** (`#P0J2J8GJ`) - main clan
- 🎓 **Akademia CoC PL** (`#JPRPRVUY`) - academy
- 🔥 **Psychole!** (`#29RYVJ8C8`) - training

## Feature Highlights
- Home dashboard with family-wide standings, total star counter, and quick links into each clan
- Clan detail view with KPI bar (rank, stars, destruction, attacks) and sortable player performance table
- Global player leaderboard with live search, rank highlighting, and tabular layout tuned for both desktop and mobile
- Multilingual interface (Polish default, English fallback) powered by `i18next` with automatic language detection and persistence
- Tailored esports-inspired theme using shadcn/ui primitives, phosphor icons, animated accents, and responsive design tokens
- Build-time data pipeline that converts a CWL Excel workbook into static JSON feeds for zero-runtime hosting

## Tech Stack
- Vite + React 19 SPA
- Tailwind CSS v4 with shadcn/ui component primitives and lucide/phosphor iconography
- `i18next` + `react-i18next` + browser language detector for bilingual content
- Custom ExcelJS ingestion script (`scripts/build-data.ts`) running via `tsx`
- Static JSON content served from `public/data` for compatibility with Vercel static hosting and other edge CDNs

## Project Structure
- `src/main.tsx` – Vite entry point
- `src/App.tsx` + `src/pages/*` – route-level React components for Home, Clan, Players, and About
- `src/components` – UI primitives (navigation, cards, tables, KPIs) plus shadcn/ui wrappers in `components/ui`
- `src/lib` – data helpers, shared types, i18n initialization, and utilities
- `public/data` – generated JSON assets (family, players, per-clan) consumed at runtime
- `data-src` – source-of-truth XLSX drop zone (`cwl-stats.xlsx`) used by the build script
- `scripts/build-data.ts` – ExcelJS ➜ JSON transformation pipeline invoked before production builds

## Getting Started
1. **Install dependencies**
	```bash
	npm install
	```
2. **Provide the latest CWL workbook**
	- Place `cwl-stats.xlsx` in `data-src/`
	- Sheet names should follow the convention showcased in prior exports (ranking sheet plus `<ClanName> (...)` player sheets)
3. **Generate JSON feeds**
	```bash
	npm run prebuild
	```
	This populates `public/data` with `family.json`, `players.json`, and per-clan files keyed by clan tag.
4. **Run the development server**
	```bash
	npm run dev
	```
	Visit `http://localhost:3000` to explore the dashboard with hot reload.

## Production Build
```bash
npm run build
npm run preview
```
`prebuild` runs automatically inside `npm run build` to refresh JSON assets. `npm run preview` serves the built `dist/` bundle locally; deploy `dist/` to any static host (Vercel recommended).

## Deployment Notes
- The production site is deployed on Vercel using the static output in `dist/`.
- Ensure `public/data` is updated before a release build; commits should include the generated JSON so the Vercel pipeline serves the latest standings. If `data-src/cwl-stats.xlsx` is absent, the build skips regeneration but completes with the previously generated data.

## Vercel CLI workflow
1. Install & sign in
	- `npm install -g vercel`
	- `vercel login` (device code) or `vercel login --token <token>`
2. Link the project (one-time per workspace)
	- From repo root: `vercel link` and select the team/project (framework: **Vite**, build command: `npm run build`, output: `dist`)
3. (Optional) Pull env vars
	- `vercel pull` writes `.env.local`; this project currently relies only on static data, so no required env vars.
4. Deploy
	- Preview: `vercel`
	- Production: `vercel --prod`
5. Inspect deployments
	- Use the VS Code Vercel extension or `vercel inspect <deployment-url>` for logs and artifacts.

## Data Workflow
- Clan metadata is keyed by tag inside `scripts/build-data.ts` to guarantee consistent clan ordering and file naming.
- The builder enforces tabular numeric parsing, normalizes missing values to `null`, and sorts family standings and player leaderboards before writing JSON.
- Generated timestamps (`generatedAt`) power the “Updated” badge on the home dashboard via `date-fns` relative formatting.
- If the workbook is absent the script exits gracefully after warning, allowing previously generated JSON to remain in place for continued local iteration.

## Internationalization
- Language resources live in `src/locales/en.json` and `src/locales/pl.json`.
- Language detection prioritizes `localStorage`, with Polish (`pl`) as the default when no preference exists.
- The navigation bar exposes a toggle so viewers can switch languages without a page reload.

## 📚 Documentation

Comprehensive guides for developers and AI agents working on this project:

- **[Architecture Guide](./docs/ARCHITECTURE.md)** – System design, data flow, routing architecture, i18n setup, styling system, and build process
- **[Development Guide](./docs/DEVELOPMENT.md)** – Local development setup, code style standards, file organization, common tasks, and troubleshooting
- **[Deployment Guide](./docs/DEPLOYMENT.md)** – Vercel operations, deployment methods, monitoring, performance, and maintenance
- **[Copilot Agent Instructions](./docs/COPILOT_INSTRUCTIONS.md)** – Detailed guide for AI-assisted development, code quality standards, and common workflows

## Contributing
- Follow the established commit workflow in the main repository; keep generated datasets in sync with the latest CWL results.
- When expanding data fields, update `src/lib/types.ts`, the build script, and any consuming UI components to maintain type safety and runtime consistency.
- Add locale keys to both `en` and `pl` resource files and verify toggling paths before opening a pull request.
- Review the [Development Guide](./docs/DEVELOPMENT.md) and [Copilot Agent Instructions](./docs/COPILOT_INSTRUCTIONS.md) before starting work.

## License

Released under the MIT License. See `LICENSE` for details.
