# CLAUDE.md

This document is the required working guide for Claude/Codex/AI agents and developers working in the `ElectronApp` repository.

It is synchronized with `Refractor.md`. Treat this file as the day-to-day engineering rules and `Refractor.md` as the detailed phased refactor plan.

## Project Overview

`ElectronApp` is a desktop music player named Sonic, built with Electron. The app manages a local music library, reads `.mp3` files, extracts ID3 metadata, lets users create playlists/folders, and stores local app data in JSON files under `db/`.

The app is local-first and offline-friendly. Every change must protect the user's music files, media files, and local JSON data. Do not delete, move, overwrite, or migrate user data unless the user explicitly requests it or the existing UI flow clearly requires it.

Current architecture:

- `main.js`: Electron main process, window creation, IPC handlers, JSON DB persistence, filesystem operations, library scanning, media asset handling, and music metadata work.
- `preload.js`: secure context bridge exposing `window.electronAPI`.
- `index.html`: single-page UI structure, view markup, modal markup, inline SVG/icons, and renderer script loading.
- `css/style.css`: application styles, global tokens, layout, components, and view-specific styles in one large stylesheet.
- `js/renderer.js`: renderer state, DOM rendering, player controls, library/profile/settings views, modals, drag/drop, history, favorites, and app boot logic.
- `db/`: local JSON data store.
- `media/` and `music/`: local assets and music files.

## Critical Domain Boundary

Album and Playlist are two different concepts and must remain separate.

- Playlist: a user-created list/collection. In the current app, a playlist can be linked to a physical folder through `playlist.folderName`.
- Album: metadata from a track, usually the ID3 `album` tag. Album records are stored in `album.json` and referenced by `track.albumId`.

Mandatory rules:

- Code that manages user-created lists/folders belongs to playlist/folder modules.
- Code that reads or edits ID3 album metadata belongs to metadata/album modules.
- Do not use playlist title as album metadata.
- Do not use ID3 album as the source of truth for user-created playlists.
- Do not name a new internal function `createAlbum`, `moveFilesToAlbum`, or `deleteAlbum` when it actually manages user-created playlists/folders. Keep old public IPC names only for backward compatibility.

Correct language:

- Use `playlist`, `playlistFolder`, `folderName`, or `collection` for user-created lists/folders.
- Use `metadataAlbum`, `id3Album`, `albumId`, or `albumTag` for track metadata albums.

Compatibility exception:

- Existing public IPC names such as `fs:createAlbum`, `fs:moveFilesToAlbum`, `fs:renameAlbum`, and `fs:deleteAlbum` must stay unchanged until all callers are migrated through an explicit compatibility plan. Internally, route those handlers to correctly named playlist/folder or album metadata services.

## Tech Stack

- Desktop runtime: Electron.
- Language: JavaScript CommonJS, HTML, CSS.
- UI: Vanilla DOM API, no frontend framework.
- Styling: plain CSS in `css/style.css`, with CSS variables in `:root`.
- IPC: `ipcMain.handle(...)` in main process; `ipcRenderer.invoke(...)` exposed only through `preload.js`.
- Data store: JSON files in `db/`, read/written with `fs/promises`.
- Music metadata:
  - `node-id3` for reading/updating ID3 tags.
  - `music-metadata` for reading duration.
- Package manager: npm.
- Current script: `npm start`.

The project currently has no test runner, linter, formatter, build script, or bundler. Add tooling only when it is part of a controlled refactor phase.

## Current Directory Structure

```text
ElectronApp/
  .claude/
    CLAUDE.md
    Refractor.md
    agents/
      coding-agent.md
      test-agent.md
    rules/
  package.json
  package-lock.json
  main.js
  preload.js
  index.html
  css/
    style.css
  js/
    renderer.js
  db/
    settings.json
    orders.json
    profile.json
    track.json
    album.json
    artist.json
    history.json
    favorite.json
    playlist.json
    tag.json
  media/
    covers/
    profile/
  music/
```

## Target Structure From Refractor.md

Keep root entrypoints stable during the refactor:

- `main.js`
- `preload.js`
- `index.html`
- `css/style.css`

Move implementation gradually into `src/`:

```text
src/
  shared/
    constants.js
    ids.js
    file-url.js
    validators.js

  main/
    app-window.js
    app-state.js
    db-store.js
    metadata-service.js
    library-scan-service.js
    playlist-service.js
    album-metadata-service.js
    file-service.js
    media-service.js
    dialog-service.js
    ipc/
      index.js
      db-ipc.js
      app-ipc.js
      fs-ipc.js
      dialog-ipc.js
      music-ipc.js

  renderer/
    app.js
    state.js
    dom.js
    api.js
    events.js
    utils/
      format-time.js
      dom-safe.js
      ids.js
    components/
      smart-selector.js
      multi-smart-selector.js
      confirm-modal.js
      track-row.js
      album-card.js
      playlist-card.js
    player/
      audio-player.js
      queue.js
      controls.js
      persistence.js
    views/
      home-view.js
      library-view.js
      playing-view.js
      settings-view.js
      profile-view.js
    features/
      favorites.js
      history.js
      library-manager.js
      metadata-editor.js
      drag-drop-order.js
```

Future CSS target:

```text
css/
  style.css
  tokens.css
  base.css
  layout.css
  components/
    buttons.css
    modals.css
    player.css
    sidebar.css
    smart-selector.css
  views/
    home.css
    library.css
    settings.css
    profile.css
    playing.css
```

## Non-Negotiable Compatibility Rules

These rules apply to every refactor phase:

- Do not change DB file names under `db/`.
- Do not change existing ID formats: `trk_`, `art_`, `alb_`, `pl_`, `usr_`, `tag_`.
- Do not change IPC channel names until all callers are migrated.
- Do not change existing DOM IDs until all selectors and event handlers are migrated.
- Do not delete or rename existing CSS classes until all HTML/JS references are migrated.
- Do not change media paths without a migration.
- Do not move/delete user music, media, or DB files as part of structural refactoring.
- Keep `contextIsolation: true`.
- Keep `nodeIntegration: false`.
- Renderer code must only call main process APIs through `window.electronAPI`.
- Preserve current app behavior unless the user explicitly asks for a behavior change.

Stable media paths:

- `media/profile/avatar.png`
- `media/profile/banner.png`
- `media/covers/<trackId>.<ext>`
- `images/<albumName>/avatar.png` inside the master music directory

Stable major view IDs:

- `view-home`
- `view-playing`
- `view-library`
- `view-settings`
- `view-profile`

Stable major player IDs:

- `audio-player`
- `btn-play-pause`
- `btn-prev`
- `btn-next`
- `progress-bar`
- `volume-bar`

## Data Model And Constants

Valid DB table names:

```js
const DB_TABLES = [
  'settings',
  'orders',
  'profile',
  'track',
  'album',
  'artist',
  'history',
  'favorite',
  'playlist',
  'tag'
];
```

Important IDs and prefixes:

- Default user: `usr_default`
- Root album: `alb_root`
- Track IDs: `trk_...`
- Artist IDs: `art_...`
- Album IDs: `alb_...`
- Playlist IDs: `pl_...`
- User IDs: `usr_...`
- Tag IDs: `tag_...`

Recommended shared constants for Phase 1:

```js
const DEFAULT_USER_ID = 'usr_default';
const ROOT_ALBUM_ID = 'alb_root';
const UNKNOWN_ARTIST = 'Unknown Artist';
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
```

Do not change the hash algorithm or output format of ID helpers unless a migration is planned and tested.

## Existing IPC Channels

DB:

- `db:getAll`
- `db:set`
- `db:remove`

App:

- `app:toggleDevTools`

Filesystem/library/media:

- `fs:getMasterDir`
- `fs:setMasterDir`
- `fs:migrateMasterDir`
- `fs:createAlbum`
- `fs:moveFilesToAlbum`
- `fs:renameAlbum`
- `fs:deleteAlbum`
- `fs:deleteFiles`
- `fs:changeAlbumCover`
- `fs:changeProfileAvatar`
- `fs:changeProfileBanner`
- `fs:scanMasterDir`

Dialogs:

- `dialog:pickFolder`
- `dialog:pickMultipleFiles`

Music:

- `music:updateTags`

Every new IPC API must be defined in three layers:

1. `ipcMain.handle(...)` in the main process.
2. A wrapper in `preload.js`.
3. A renderer call through `window.electronAPI`.

Never call or expose raw `ipcRenderer` from renderer code.

## Entrypoint Strategy

### Main Process

Root `main.js` must remain the Electron bootstrap file during refactor.

Target responsibility:

- Import dependencies/modules.
- Initialize app state.
- Initialize DB.
- Create the browser window.
- Register IPC handlers.
- Handle Electron app lifecycle events.

Do not move everything in one change. Split DB, services, and IPC gradually as described in `Refractor.md`.

### Renderer

Do not immediately convert all renderer code to ES modules unless tested in Electron.

Safe migration path:

1. Split renderer code into browser scripts attached to one namespace, for example `window.Sonic`.
2. Keep `js/renderer.js` as the boot/compatibility file during early phases.
3. Preserve temporary globals required by existing inline handlers, such as `window.playSong`, until inline handlers are removed.
4. After inline handlers and global dependencies are gone, consider switching to `<script type="module">`.

Temporary safe pattern:

```js
window.Sonic = window.Sonic || {};

window.Sonic.formatTime = function formatTime(seconds) {
  // ...
};
```

## Rules By File Type

### `main.js`

Purpose:

- Electron bootstrap, lifecycle wiring, and temporary home for main-process code until split.

Rules:

- Must not contain UI rendering logic.
- Must not use DOM APIs.
- Every IPC handler should return a compatible object such as `{ success: true, ... }` or `{ success: false, error }`.
- Validate IPC input before filesystem operations.
- Validate DB category with the allowlist before read/write.
- Avoid empty `catch` blocks for DB, filesystem, metadata, and IPC operations.
- Use `path.join`, `path.basename`, `path.extname`, and shared path helpers instead of manual path string manipulation.
- Handle `EXDEV` for cross-device moves.
- Keep existing IPC channels stable while moving implementation behind them.

Target split:

- `src/main/app-window.js`
- `src/main/app-state.js`
- `src/main/db-store.js`
- `src/main/metadata-service.js`
- `src/main/library-scan-service.js`
- `src/main/playlist-service.js`
- `src/main/album-metadata-service.js`
- `src/main/file-service.js`
- `src/main/media-service.js`
- `src/main/dialog-service.js`
- `src/main/ipc/*`

### `preload.js`

Purpose:

- Security boundary between renderer and main process.

Rules:

- Do not expose raw `ipcRenderer`.
- Do not expose Node.js or Electron APIs directly.
- API names should be clear verbs.
- Use object input when an API needs two or more arguments.
- Keep raw IPC channel names hidden from renderer code.
- Group APIs by domain when editing:
  - master directory
  - dialogs
  - library/playlist
  - media/profile
  - app/dev
  - music metadata
  - DB

Optional later target:

- `src/preload/api-map.js`

### `js/renderer.js`

Purpose:

- Current renderer boot file and temporary compatibility layer during refactor.

Rules:

- Do not use Node.js APIs.
- Do not import `fs`, `path`, or `electron`.
- Do not manipulate files directly from renderer code.
- Limit global mutable state.
- Keep existing globals only as a transitional compatibility layer.
- Use `window.electronAPI` for all main-process calls.
- Do not use `innerHTML` with dynamic user input, DB text, or music metadata.
- Prefer `document.createElement`, `textContent`, `classList`, `dataset`, and `addEventListener`.
- Do not add new inline `onclick` handlers.
- Each render function should own one UI region.
- Avoid mixing UI rendering, DB mutation, and playback behavior in one function.

Target split:

- `src/renderer/state.js`
- `src/renderer/dom.js`
- `src/renderer/api.js`
- `src/renderer/events.js`
- `src/renderer/utils/*`
- `src/renderer/components/*`
- `src/renderer/player/*`
- `src/renderer/views/*`
- `src/renderer/features/*`

### `index.html`

Purpose:

- App structure, stable DOM anchors, views, and modal containers.

Rules:

- Do not add inline scripts.
- Do not add inline event handlers.
- Limit inline `style`; move styling into CSS classes.
- Any element accessed from JS should keep a stable `id`.
- Keep CSP strict.
- Do not remove a DOM node unless every JS reference is updated.
- Keep UI language consistent.

### `css/style.css`

Purpose:

- Current single stylesheet and future import entrypoint.

Rules:

- Use CSS variables in `:root` for repeated colors, radius, fonts, and spacing.
- Avoid adding unrelated hard-coded colors when an existing token fits.
- Name classes by component/function.
- Avoid broad selectors that can unexpectedly affect the whole app.
- Group styles with short comments.
- Search `index.html` and renderer files before removing or renaming classes.
- Do not redesign while splitting CSS.
- Keep class names stable during the first CSS split.

Safe future approach:

```css
@import url('./tokens.css');
@import url('./base.css');
@import url('./layout.css');
@import url('./components/buttons.css');
@import url('./components/modals.css');
@import url('./components/player.css');
@import url('./components/sidebar.css');
@import url('./components/smart-selector.css');
@import url('./views/home.css');
@import url('./views/library.css');
@import url('./views/settings.css');
@import url('./views/profile.css');
@import url('./views/playing.css');
```

### `db/*.json`

Purpose:

- Local app data.

Rules:

- Format JSON with 2 spaces.
- Do not manually edit DB files unless the task requires it.
- Do not commit private user data or real music metadata if this repo is shared.
- If a schema migration is needed, write clear migration code and preserve backward compatibility.
- When adding a new field, renderer code must have fallback behavior for old records.
- Save only affected tables where possible.
- Prefer atomic writes after the DB layer is stable.

### `media/` And `music/`

Purpose:

- User/local assets and music library.

Rules:

- Do not delete, rename, compress, move, or overwrite media/music files unless explicitly requested.
- Do not commit large music files to a shared source repo.
- When creating or changing covers/avatar/banner assets, update the related DB/path references.

### `package.json`

Rules:

- Add scripts deliberately: `lint`, `format`, `format:check`, `test`, `start`.
- Keep runtime dependencies and dev dependencies separate.
- Do not update major package versions unless the app is tested afterward.
- After dependency changes, run `npm install` so `package-lock.json` stays synchronized.

## Refactor Phase Rules

Follow the order in `Refractor.md`.

### Phase 0: Baseline And Safety Checks

- Run `npm start` if behavior will be changed.
- Record existing console/runtime errors.
- Manually verify launch, navigation, playback, library scan, playlist/folder operations, metadata edit, profile, and settings.
- Do not change behavior in this phase.

### Phase 1: Shared Constants And Pure Helpers

- Create `src/shared/constants.js`, `src/shared/ids.js`, `src/shared/file-url.js`, and `src/shared/validators.js`.
- Move duplicated constants/helpers first.
- Do not change ID/hash behavior.
- Do not change file URL output format.

### Phase 2: Main DB Layer

- Create `src/main/db-store.js` and `src/main/app-state.js`.
- Move DB initialization, load, save, validation, and table helpers.
- Add DB table allowlist validation for `db:set`.

### Phase 3: Main Services

- Split metadata, scan, playlist/folder, album metadata, filesystem, media, and dialog behavior into focused services.
- Keep playlist/folder logic separate from ID3 album metadata logic.

### Phase 4: IPC Registration

- Move IPC registration into `src/main/ipc/*`.
- Keep channel names and return shapes compatible.
- Do not rename preload methods unless every caller is updated.

### Phase 5: Preload API

- Group preload methods by domain.
- Optionally move API map into `src/preload/api-map.js`.
- Never expose raw IPC.

### Phase 6: Renderer State, DOM, And API

- Create state, DOM selector, API wrapper, and utility modules.
- Keep transitional `window.Sonic` or existing globals as needed.
- Move one state group at a time.

### Phase 7: Renderer Components

- Extract smart selectors, confirm modals, track rows, album cards, and playlist cards.
- Use safe DOM creation for dynamic metadata/user text.

### Phase 8: Renderer Views

- Extract home, library, playing, settings, and profile views.
- Keep DOM IDs and CSS classes stable.

### Phase 9: Player Features

- Extract audio player, queue, controls, and persistence.
- Preserve shuffle, repeat, history, favorite, queue, and active UI behavior.

### Phase 10: Feature Modules

- Extract favorites, history, library manager, metadata editor, and drag/drop ordering.
- Use names that preserve playlist vs album boundaries.

### Phase 11: CSS Refactor

- Split CSS gradually through `@import`.
- Do not redesign while moving styles.
- Verify player bar, sidebar, modals, library grid, profile page, and now-playing view after each CSS move.

### Phase 12: HTML Cleanup

- Remove inline styles gradually.
- Replace inline event handlers with JS event listeners.
- Keep stable DOM anchors.
- Keep CSP strict.

## Current Function Mapping

### Main Process

| Current item | Target file |
| --- | --- |
| `generateId` | `src/shared/ids.js` |
| `sanitizeFolderName` | `src/shared/validators.js` or `src/main/file-service.js` |
| `loadTable`, `initDB`, `saveDB` | `src/main/db-store.js` |
| `createWindow` | `src/main/app-window.js` |
| `db:getAll`, `db:set`, `db:remove` | `src/main/ipc/db-ipc.js` |
| `app:toggleDevTools` | `src/main/ipc/app-ipc.js` |
| `dialog:pickFolder`, `dialog:pickMultipleFiles` | `src/main/ipc/dialog-ipc.js` |
| `fs:getMasterDir`, `fs:setMasterDir` | `src/main/ipc/fs-ipc.js` |
| `fs:migrateMasterDir` | `src/main/file-service.js` + `src/main/ipc/fs-ipc.js` |
| `fs:createAlbum` | Keep public IPC, route internally to playlist/folder service |
| `fs:moveFilesToAlbum` | Keep public IPC, split playlist/folder behavior from album metadata behavior |
| `fs:renameAlbum`, `fs:deleteAlbum` | Carefully split playlist/folder behavior from metadata album behavior |
| `fs:deleteFiles` | `src/main/file-service.js` |
| `fs:changeAlbumCover` | `src/main/media-service.js` |
| `fs:changeProfileAvatar`, `fs:changeProfileBanner` | `src/main/media-service.js` |
| `fs:scanMasterDir` | `src/main/library-scan-service.js` |
| `music:updateTags` | `src/main/metadata-service.js` + `src/main/ipc/music-ipc.js` |

### Renderer

| Current item | Target file |
| --- | --- |
| Global state variables | `src/renderer/state.js` |
| DOM selectors | `src/renderer/dom.js` |
| Renderer API calls | `src/renderer/api.js` |
| `generateId` | `src/renderer/utils/ids.js`, then align with shared helper |
| `SmartSelector` | `src/renderer/components/smart-selector.js` |
| `MultiSmartSelector` | `src/renderer/components/multi-smart-selector.js` |
| `showConfirm`, `showConfirmModal` | `src/renderer/components/confirm-modal.js` |
| Track row creation | `src/renderer/components/track-row.js` |
| Album/playlist cards | `src/renderer/components/album-card.js`, `src/renderer/components/playlist-card.js` |
| `switchView` | `src/renderer/events.js` or `src/renderer/views/router.js` |
| `refreshLibrary`, `renderAlbumsGrid`, `renderLibrary` | `src/renderer/views/library-view.js` |
| `renderHome` | `src/renderer/views/home-view.js` |
| Now-playing screen logic | `src/renderer/views/playing-view.js` |
| Settings and migration UI | `src/renderer/views/settings-view.js` |
| Profile rendering/forms | `src/renderer/views/profile-view.js` |
| `playSong`, `playNext`, `playPrev`, `updatePlayPauseBtn` | `src/renderer/player/*` |
| Queue UI/persistence | `src/renderer/player/queue.js`, `src/renderer/player/persistence.js` |
| `formatTime` | `src/renderer/utils/format-time.js` |
| DOM escaping/safe creation | `src/renderer/utils/dom-safe.js` |
| Metadata editor modal | `src/renderer/features/metadata-editor.js` |
| Favorites | `src/renderer/features/favorites.js` |
| History | `src/renderer/features/history.js` |
| Library manager flows | `src/renderer/features/library-manager.js` |
| Drag/drop ordering | `src/renderer/features/drag-drop-order.js` |
| `bootApp` | `src/renderer/app.js` |

## Coding Rules

### General JavaScript

- Use `const` by default.
- Use `let` only when reassignment is required.
- Prefer small, named functions over long inline callbacks.
- Prefer early returns over deep nesting.
- Keep one module focused on one responsibility.
- Export a small public API from each module.
- Keep side effects visible in function names.
- Split functions that grow beyond roughly 80-120 lines.
- Do not repeat literal strings for DB tables, IPC channels, path segments, statuses, or setting keys.
- Do not mix UI rendering, persistence, filesystem work, and playback behavior in the same function.

### Error Handling

- Do not use empty `catch` blocks for important operations.
- Return stable IPC error objects:

```js
return { success: false, error: error.message };
```

- Log unexpected main-process failures with useful context.
- Do not expose long stack traces in renderer UI.

### DOM Safety

- Render user input, DB text, and music metadata through `textContent`.
- Use `createElement` for dynamic rows/cards.
- Use `addEventListener`, not inline `onclick`.
- If `innerHTML` is used for static SVG/icon markup, keep dynamic text outside it.
- Do not use `innerHTML +=` in loops.
- Use controlled event delegation with `data-*` attributes for rendered lists.

### IPC And Validation

- Renderer code must only call `window.electronAPI`.
- Main process must validate:
  - DB category is in the allowlist.
  - Path/file exists when required.
  - File extension is supported.
  - Album/playlist/folder names remain valid after sanitization.
  - File operations do not accidentally target unrelated user paths.

### Filesystem

- Use `path` APIs for path work.
- Use one helper for path-to-file-URL conversion.
- Convert Windows backslashes to forward slashes in local file URLs.
- Handle filename collisions before moving/copying.
- Handle `EXDEV` moves with copy + unlink.
- Use clear error handling for multi-file move/delete/migrate flows.

### DB And Persistence

- Save only affected tables.
- Use a helper such as `saveTables(state, ['artist', 'album', 'track'])` when saving multiple tables.
- Prefer atomic JSON writes once the DB layer is stable.
- Add fallback logic for old records when adding fields.
- When deleting a track, synchronize `favorite`, `history`, `playlist.tracks`, and `orders`.
- Do not change DB schema without fallback/migration.

### UI/UX

- Keep the existing app style stable during refactor.
- Use classes instead of inline styles.
- Destructive modals must require confirmation.
- Provide loading/error/empty states for library scan, file move, migration, profile save, and settings actions.
- Avoid blocking the UI for long library scans; add progress state when refactoring that area.

## Suggested Tooling

Add tooling only after Phase 1 or Phase 2, when behavior is stable.

Recommended packages:

- ESLint for JavaScript correctness.
- Prettier for formatting.
- Optional simple tests using Node's built-in test runner.

Suggested scripts:

```json
{
  "scripts": {
    "start": "electron .",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "node --test"
  }
}
```

Initial test targets:

- `generateId`
- `sanitizeFolderName`
- path-to-file-URL helper
- DB category validation
- playlist vs album metadata helper behavior

## Manual Regression Checklist

Run this checklist after every refactor phase that changes behavior or code wiring.

App startup:

- App opens with `npm start`.
- No fatal main-process error.
- No fatal renderer console error.

Navigation:

- Home view opens.
- Library view opens.
- Settings view opens.
- Profile view opens.
- Now-playing view opens and closes.

Playback:

- A track can be played.
- Pause/resume works.
- Next/previous works.
- Progress bar updates.
- Seeking works.
- Volume control works.
- Shuffle/repeat behavior is unchanged.

Library:

- Master directory loads.
- Scan library works.
- Root songs render.
- Playlist/folder collections render.
- Track covers render.
- Empty states still appear correctly.

Playlist/folder operations:

- User-created playlist/folder can be created.
- Files can be moved into a playlist/folder.
- Playlist/folder can be renamed.
- Playlist/folder can be deleted with keep-files behavior.
- Playlist/folder can be deleted with remove-files behavior only when explicitly confirmed.

Album metadata:

- Track ID3 album is read.
- `album.json` metadata records are created/updated from track metadata.
- Editing metadata does not accidentally create a user playlist.
- User playlists do not overwrite ID3 album metadata.

Profile/settings:

- Profile username/email renders.
- Avatar update works.
- Banner update works.
- Settings are saved.
- Custom master directory still works.
- Migration UI still works if applicable.

Persistence:

- Favorites persist after restart.
- History persists after restart.
- Queue persists if `keepQueue` is enabled.
- Custom order persists after restart.

## High-Risk Areas

Handle these slowly and test after each change:

- Track ID generation and deletion cleanup.
- `fs:moveFilesToAlbum`, because it touches filesystem, track DB, artist DB, album metadata DB, playlist DB, history DB, and covers.
- `fs:scanMasterDir`, because it discovers files, upserts metadata, removes stale records, and returns UI data.
- Renderer `renderLibrary`, because it controls track rows, filters, selection, actions, and drag/drop behavior.
- Player queue persistence, because it interacts with settings and playback UI.
- Inline `onclick` usage and any code that expects functions to exist on `window`.

## Recommended Commit Strategy

Use small commits by phase.

Good examples:

- `refactor: add shared constants and id helpers`
- `refactor: move json db persistence into db-store`
- `refactor: split main ipc handlers by domain`
- `refactor: extract renderer player queue module`
- `refactor: split library view rendering`
- `refactor: move smart selectors into components`
- `refactor: split css into component files`

Avoid commits that mix:

- Refactor plus redesign.
- Refactor plus DB schema migration.
- Refactor plus dependency upgrade.
- Refactor plus feature changes.

## Mandatory Rules

- Do not revert changes made by someone else unless explicitly asked.
- Do not delete/move user music, media, or DB files unless explicitly requested.
- Do not edit `.vscode/` unless the task requires it.
- Do not expose Node/Electron APIs directly to the renderer.
- Do not disable `contextIsolation`.
- Do not enable `nodeIntegration`.
- Do not add a dependency without a clear reason.
- Do not commit `node_modules`.
- Do not commit secrets, tokens, passwords, large music files, private media, or private user DB data.
- Do not change the DB schema without fallback/migration.
- Do not change ID formats without migration.
- Do not rename public IPC channels without a compatibility migration.
- Do not rename DOM IDs or CSS classes without updating all references.
- After important behavior changes, run `npm start` for a smoke test if the environment allows it.

## Definition Of Done For The Full Refactor

The refactor is complete when:

- `main.js` is only app bootstrap/lifecycle wiring.
- `preload.js` only exposes a clear API map.
- `renderer.js` is removed or reduced to a tiny compatibility bootstrap.
- Main process logic is split into DB, filesystem, metadata, playlist, album metadata, media, dialog, and IPC modules.
- Renderer logic is split into state, DOM/API wrappers, views, components, player, and feature modules.
- CSS is split into tokens/base/layout/components/views.
- Inline styles and inline event handlers are substantially reduced.
- Dynamic metadata/user text is rendered safely.
- Album and playlist concepts are consistently separated in code names and data flow.
- Manual regression checklist passes.
- Lint/format/test scripts exist, or there is a documented reason they are not added yet.

## Suggested Workflow For New Tasks

1. Read `package.json`, relevant source files, `CLAUDE.md`, `Refractor.md`, and git status.
2. Identify whether the change belongs in main, preload, renderer, CSS, DB, or multiple layers.
3. Check whether the work belongs to a refactor phase.
4. Preserve compatibility rules before changing names, paths, schemas, IDs, IPC, DOM IDs, or CSS classes.
5. In the main Claude window, write a concrete implementation plan before code changes start.
6. Invoke `coding-agent` in a separate context window with the plan, allowed files/areas, compatibility constraints, and expected verification.
7. After `coding-agent` finishes, review its handoff in the main window.
8. Invoke `test-agent` in a separate context window to test and review the completed changes.
9. If `test-agent` reports required fixes, update the plan and repeat the `coding-agent` then `test-agent` handoff.
10. If adding IPC, update main, preload, renderer, and this document if the API becomes permanent.
11. If changing data, check compatibility with existing DB records.
12. If changing UI, verify related DOM selectors and CSS classes.
13. Report changed files, tests run, test-agent recommendation, and remaining risks.

## Claude Agent Handoff Workflow

Use separate context windows for implementation and testing:

1. Main window reads context, writes the implementation plan, and owns scope.
2. Main window calls `coding-agent` with the plan.
3. `coding-agent` implements the plan and reports changed files, verification, and risk notes.
4. Main window reviews the coding handoff.
5. Main window calls `test-agent` with the coding handoff and changed files.
6. `test-agent` runs regression checks, reviews rule compliance, and ends with `## Recommendation`.
7. Main window gives the user the final summary and any remaining risks.

The main window should not skip directly from planning to final response when code changed. The expected sequence is:

```text
main window plan -> coding-agent implementation -> test-agent verification -> main window final summary
```

## Planning Claude Code Format

When the user chooses planning in Claude Code, the main window must produce the implementation plan in the same format required by `coding-agent`.

Use this exact structure:

```text
Task:
<single concise goal>

Implementation plan:
1. <step>
2. <step>
3. <step>

Allowed files / areas:
- <file or directory>

Compatibility constraints:
- <IPC, DB, DOM, CSS, path, data, or behavior constraints>

Verification expected:
- <commands or manual checks to run if applicable>
```

After the user approves the planning output, start `coding-agent` in a separate context window and pass this full block to it. After `coding-agent` finishes, start `test-agent` in another separate context window with the coding handoff and changed files.

## Important
After all the refactor phases are done, update this document and all the rules to reflect the new architecture.
Delete Refractor.md because we will use CLAUDE.md mainly.
