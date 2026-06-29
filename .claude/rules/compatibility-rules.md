# Compatibility Rules

These rules apply to **every refactor phase** without exception. Breaking any of them requires an explicit migration plan.

## Database

- Do **not** change DB file names under `db/`.
- Do **not** change existing ID formats: `trk_`, `art_`, `alb_`, `pl_`, `usr_`, `tag_`.
- Do **not** change the DB schema without fallback/migration code.
- Do **not** change ID formats without a migration plan.

## IPC Channels

- Do **not** change IPC channel names until all callers are migrated.
- Do **not** rename public IPC channels without a compatibility migration.

## DOM

- Do **not** change existing DOM IDs until all selectors and event handlers are migrated.
- Do **not** rename DOM IDs or CSS classes without updating all references.

Stable major **view IDs** (never change these):

- `view-home`
- `view-playing`
- `view-library`
- `view-settings`
- `view-profile`

Stable major **player IDs** (never change during early cleanup):

- `audio-player`
- `btn-play-pause`
- `btn-prev`
- `btn-next`
- `progress-bar`
- `volume-bar`

## CSS

- Do **not** delete or rename existing CSS classes until all HTML/JS references are migrated.
- Do **not** redesign while splitting CSS.
- Keep class names stable during the first CSS split.

## Media Paths

Do **not** change media paths without a migration. Stable paths:

- `media/profile/avatar.png`
- `media/profile/banner.png`
- `media/covers/<trackId>.<ext>`
- `images/<albumName>/avatar.png` inside the master music directory

## User Data

- Do **not** move, delete, rename, compress, or overwrite user music, media, or DB files as part of structural refactoring.
- Do **not** commit large music files, private media, or private user DB data.

## Security

- Keep `contextIsolation: true` — do **not** disable it.
- Keep `nodeIntegration: false` — do **not** enable it.
- Renderer code must only call main process APIs through `window.electronAPI`.
- Do **not** expose raw `ipcRenderer` to the renderer.
- Do **not** expose Node.js or Electron APIs directly to the renderer.

## Behavior

- Preserve current app behavior unless the user explicitly asks for a behavior change.
- Do **not** revert changes made by someone else unless explicitly asked.
- After important behavior changes, run `npm start` for a smoke test if the environment allows it.

## Tooling & Dependencies

- Do **not** add a dependency without a clear reason.
- Do **not** commit `node_modules`.
- Do **not** commit secrets, tokens, or passwords.
- Do **not** update major package versions unless the app is tested afterward.
- After dependency changes, run `npm install` so `package-lock.json` stays synchronized.

## Other

- Do **not** edit `.vscode/` unless the task requires it.
