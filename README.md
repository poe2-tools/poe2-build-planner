# PoE 2 Build Planner

A local-first web app to **visualize, create, and edit** Path of Exile 2 `.build` files —
the official, shareable build-plan format. It covers the full passive skill tree, skill and
support gems, items, and per-level "build profiles", and renders **fully offline**: all game
data and icons are vendored into the app, so it needs no network access at runtime.

- **Passive tree** — pan/zoom Canvas2D renderer of the ~5,100-node tree with connectivity +
  point-budget enforcement, shortest-path auto-allocation, ascendancy overlays, weapon-set
  tagging, and per-node notes.
- **Skills** — searchable skill/support gem picker with icons, drag-free reordering, and
  per-setup level intervals.
- **Items** — equipment slots grouped by category, with free-text mod plans.
- **Build profiles** — independent per-level-range snapshots of passives/skills/items for
  leveling guides.
- **Lossless `.build` I/O** — load and save GGG `.build` JSON, preserving unknown fields.

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ (ships with `npm`)
- Windows + PowerShell is the primary dev environment, but any OS works.

## Setup

```powershell
npm install
```

This installs dependencies. A `predev`/`prebuild` hook automatically copies the vendored
passive-tree data into `public/` the first time you run the app or build (see
[Data & assets](#data--assets)).

## Running

```powershell
npm run dev        # start the Vite dev server at http://localhost:5173
```

Open the printed URL. Load an existing `.build` with **Load .build** in the header, or pick a
class to start a new one. **Save .build** downloads the current plan as a `.build` file.

## Commands

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the Vite dev server (runs `copy-tree` first). |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` (runs `copy-tree` first). |
| `npm run preview` | Serve the production build locally. |
| `npm test` | Run the test suite in watch mode (Vitest). |
| `npm run test:run` | Run the test suite once (CI-style). |
| `npm run typecheck` | Type-check the whole project without emitting. |
| `npm run copy-tree` | Copy the vendored tree data + atlases from `Skill Trees/` into `public/tree/`. |
| `npm run fetch-data` | Re-download the gem-data snapshot (`skill_gems.json`) from the RePoE fork. |
| `npm run fetch-icons` | Download gem icons into `public/icons/poe2/` (skips ones already on disk). |

---

## Data & assets

All game data is **vendored** so the app works offline. There are three independent data sets:

| Data set | Committed source | Served from (runtime) | How it gets there |
|----------|------------------|------------------------|-------------------|
| Passive tree (`data.json` + sprite atlases) | `Skill Trees/<ver>/` | `public/tree/<ver>/` *(generated, gitignored)* | `scripts/copy-tree.mjs`, run by `predev`/`prebuild` |
| Skill/support gems (`skill_gems.json`) | `public/data/poe2/skill_gems.json` | same (served directly) | `scripts/fetch-data.mjs` (manual refresh) |
| Gem icons (PNG) | `public/icons/poe2/**` | same (served directly) | `scripts/fetch-icons.mjs` (manual, one-time) |

> Note: `public/tree/` is a **generated copy** of `Skill Trees/` (the committed master) and is
> gitignored, exactly like `dist/`. The build regenerates it from `Skill Trees/` and bundles
> it into `dist/`, so the deployed site always has it. Don't edit `public/tree/` by hand.

## Updating game data

### Skill / support gems (easy — fully scripted)

```powershell
npm run fetch-data     # refresh public/data/poe2/skill_gems.json from the RePoE fork (latest)
npm run fetch-icons    # download icons for any new gems (existing icons are skipped)
git add public/data public/icons
git commit -m "chore(data): refresh gem data + icons"
```

No code changes are needed — new gems are indexed automatically, and the picker filters out
dev/placeholder gems by name. The icon script reads the refreshed `skill_gems.json` and only
downloads icons it doesn't already have.

### Passive skill tree (moderate — manual export + version bump)

The tree has **no auto-fetch script**; it's pinned to a downloaded official export.

1. Download the latest passive-tree export from GGG's
   [developer data exports](https://www.pathofexile.com/developer/docs/data).
2. Place it under a new version folder, e.g. `Skill Trees/0.6.0/` containing `data.json` and
   the `assets/` atlas directory (mirror the existing `Skill Trees/0.5.2/` layout).
3. Update the pinned version string `0.5.2` → the new version in:
   - `scripts/copy-tree.mjs` (source + dest paths)
   - `src/tree/source.ts` (`TREE_BASE`, the runtime served path)
   - the tests that read it directly: `src/tree/data.test.ts`, `src/tree/source.test.ts`,
     `src/state/store.test.ts`, `src/state/ranges.test.ts`, `src/pipeline/copyTree.test.ts`
4. Verify: `npm run copy-tree && npm run test:run && npm run build`.

> The version is currently hardcoded in those few places rather than a single constant — a
> small refactor (one shared `TREE_VERSION`) would make future bumps a one-line change.

---

## Deploy to GitHub Pages

This repo ships a workflow ([`.github/workflows/deploy.yml`](.github/workflows/deploy.yml))
that builds the app and publishes it to GitHub Pages on every push to `main`/`master`. Because
all data and icons are vendored, the deployed site needs no network access at runtime.

**One-time setup:**

1. Create the repo and push (e.g. `gh repo create <name> --public --source . --push`).
2. In the repo: **Settings → Pages → Build and deployment → Source = GitHub Actions**.
3. Push to `main`/`master`. The site goes live at `https://<user>.github.io/<repo>/`.

The workflow derives the correct base path from the repo name automatically (and serves from
`/` if the repo is named `<user>.github.io`), so no config edits are needed.

## Project layout

```
src/
  buildfile/   Lossless .build JSON parse + serialize (preserves unknown fields & level intervals)
  tree/        Passive-tree data indexing + allocation engine
  render/      Canvas2D tree renderer (viewport, spatial index, LOD, arcs, ascendancy overlay)
  state/       Zustand store + per-level build "profiles" (ranges)
  gems/        Gem data index
  icons/       Local gem-icon URL helper
  ui/          React screens (tree / skills / items / build) + panels
  pipeline/    Tests for the data-vendoring scripts
Builds/        Sample .build file used as a test fixture
Skill Trees/   Vendored passive-tree data + sprite atlases — source for `copy-tree`
public/        Served static data: gem JSON snapshot, bundled gem icons (+ generated tree copy)
scripts/       Data-vendoring scripts (copy-tree, fetch-data, fetch-icons)
.github/       GitHub Pages deploy workflow
```

---

## Disclaimer

This product isn't affiliated with or endorsed by Grinding Gear Games in any way. Path of Exile
is a trademark of Grinding Gear Games. All Path of Exile game content, data, names, and art are
© Grinding Gear Games and remain their property; they are included here under GGG's fan/community
tool ecosystem for **personal, non-commercial use only**. This is an unofficial fan tool. (This
same notice is shown in the app footer, as required by GGG's developer policy.)

## Sources & licensing

This project is built on the official PoE2 build/tree formats plus community data extractions.

### Data & formats used

| Source | Used for | License / terms |
|--------|----------|------------------|
| [**GGG Build Planner docs**](https://www.pathofexile.com/developer/docs/game#buildplanner) | The `.build` file format; the bundled sample build (GGG's "Titan Warrior") | © Grinding Gear Games — see Disclaimer |
| [**GGG developer data exports**](https://www.pathofexile.com/developer/docs/data) | The official passive skill tree export (`Skill Trees/`) | © Grinding Gear Games — see Disclaimer |
| [**RePoE fork**](https://github.com/repoe-fork/poe2) (community) | Skill/support gem data (`skill_gems.json`) — metadata paths, names, colors, types, icon paths | Tooling is **MIT** (© 2016 brather1ng); the underlying game data is © Grinding Gear Games |
| [**ggpk.exposed**](https://image.ggpk.exposed/poe2/) (community) | Converts GGG's game art (DDS → PNG); the bundled gem icons are GGG art served through this tool | Art © Grinding Gear Games — see Disclaimer |

> **License notes.** This project's own source code is licensed under the **MIT License** (see
> [`LICENSE`](LICENSE)). That license applies **only** to the source code — the bundled GGG game
> data and art are GGG's property and are explicitly carved out (see the note in `LICENSE`). GGG's
> developer policy requires the non-affiliation notice (shown in the app and above) and permits
> third-party tools for personal, non-commercial use. The
> [RePoE](https://github.com/repoe-fork/repoe) tooling is MIT-licensed; its README likewise notes
> that the data itself belongs to Grinding Gear Games. The npm dependencies below are permissive
> (MIT, except TypeScript which is Apache-2.0).

### Related / fallback community projects

- **Path of Building (PoE2)** — richest community data (Lua): https://github.com/PathOfBuildingCommunity/PathOfBuilding-PoE2
- **pypoe-json** — daily PyPoE export: https://github.com/erosson/pypoe-json
- **ggpk-tool** — extract data from a local `Content.ggpk`: https://github.com/juddisjudd/ggpk-tool

### Built with

[Vite](https://vite.dev/) · [React](https://react.dev/) · [TypeScript](https://www.typescriptlang.org/) ·
[Zustand](https://github.com/pmndrs/zustand) · [Vitest](https://vitest.dev/) · Canvas2D.

## License

This project's source code is licensed under the [MIT License](LICENSE). Bundled Path of Exile 2
game data and art are © Grinding Gear Games and are **not** covered by that license — see the
[Disclaimer](#disclaimer) and the carve-out note in [`LICENSE`](LICENSE).
