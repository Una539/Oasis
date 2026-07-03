# Agent Instructions for Oasis

## Communication

- **Always respond in Chinese (中文).**

## Stack & Structure

- **Tauri v2** desktop app with **SolidJS** frontend, **Rust** backend, **Vite** build, **pnpm** package manager.
- **Frontend**: `src/` — SolidJS + TypeScript. Entry: `src/index.tsx`. Vite config: `vite.config.ts`.
- **Backend**: `src-tauri/src/` — Rust. Entry: `src-tauri/src/main.rs`. Commands live in `src-tauri/src/store.rs` (`save_todos`, `load_todos`).
- **Data**: Todo state is persisted via Rust commands to `{app_data_dir}/todos.json`. Do not try to use localStorage or browser APIs for persistence.

## Developer Commands

| Goal | Command |
|------|---------|
| Full dev (frontend + Tauri window) | `pnpm tauri dev` |
| Frontend-only dev server | `pnpm dev` (runs on **port 1420**, strict) |
| Production build | `pnpm tauri build` |
| Frontend-only build | `pnpm build` |
| Tauri CLI | `pnpm tauri` |

- **Order matters**: `pnpm build` is the `beforeBuildCommand` for Tauri; do not run `pnpm tauri build` before the frontend is built unless Tauri handles it.
- Vite ignores `src-tauri/` in watch mode. Changing Rust files does not auto-reload the Vite dev server.

## Rust Notes

- Crate lib name is `oasis_lib`, not `oasis` (see `Cargo.toml` `name` under `[lib]`).
- Linux keeps the system GTK backend; do not auto-set `GDK_BACKEND`.
- Linux conditionally sets `WEBKIT_DISABLE_DMABUF_RENDERER=1` for NVIDIA GPUs, affected Wayland client versions, or explicit `OASIS_DISABLE_DMABUF_RENDERER=1`; `OASIS_ENABLE_DMABUF_RENDERER=1` skips this fallback.
- Mobile entry point is declared: `#[cfg_attr(mobile, tauri::mobile_entry_point)]`.

## TypeScript / SolidJS Conventions

- `tsconfig.json` uses **strict** mode plus `noUnusedLocals: true` and `noUnusedParameters: true`. Unused variables will fail typecheck.
- JSX import source is `solid-js` (not React).

## Tooling Gaps

- **No test runner, linter, or formatter is configured.** Do not assume Jest, Vitest, ESLint, or Prettier exist.
- `.vscode/tasks.json` references `yarn` but the project uses `pnpm`. Treat it as stale.

## Adding Commands

To expose a new Rust command to the frontend:
1. Add the function in `src-tauri/src/store.rs` (or a new module).
2. Register it in `src-tauri/src/lib.rs` inside `tauri::generate_handler![...]`.
3. Call it from the frontend via `invoke("command_name", { args })` from `@tauri-apps/api/core`.

## License

This project is licensed under the **GNU General Public License v3.0 or later** (GPL-3.0-or-later).
Copyright (C) 2026 Uno.

All source files must retain the GPL license header. When adding new source files, copy the standard header from an existing file and update the description line as appropriate.
See the [LICENSE](../LICENSE) file for the full license text.
