# Refactor Phases

Follow the order defined in `Refractor.md`. Do not skip phases. See `Refractor.md` for full detailed plans.

## Phase 0: Baseline & Safety Checks

**Goal**: Establish a known-good baseline before moving any code.

- Run `npm start` if behavior will be changed.
- Record existing console/runtime errors.
- Manually verify: launch, navigation, playback, library scan, playlist/folder operations, metadata edit, profile, and settings.
- **Do not change any behavior in this phase.**

## Phase 1: Shared Constants & Pure Helpers

**Goal**: Remove duplicated constants/helpers without changing app behavior.

- Create `src/shared/constants.js`, `src/shared/ids.js`, `src/shared/file-url.js`, `src/shared/validators.js`.
- Move duplicated constants/helpers first.
- Do **not** change ID/hash behavior.
- Do **not** change file URL output format.

## Phase 2: Main DB Layer

**Goal**: Separate DB persistence from IPC and filesystem logic.

- Create `src/main/db-store.js` and `src/main/app-state.js`.
- Move DB initialization, load, save, validation, and table helpers.
- Add DB table allowlist validation for `db:set`.
- Keep JSON formatting at 2 spaces.

## Phase 3: Main Services

**Goal**: Move domain behavior out of `main.js`.

- Split metadata, scan, playlist/folder, album metadata, filesystem, media, and dialog behavior into focused services.
- Keep **playlist/folder logic separate from ID3 album metadata logic**.

| Module | Owns |
|---|---|
| `metadata-service.js` | ID3 read/update, duration read, cover extraction |
| `library-scan-service.js` | Scanning master directory, dry run result, orphan cleanup |
| `playlist-service.js` | User-created playlists, folderName, playlist-track association |
| `album-metadata-service.js` | ID3 album records in `album.json` |
| `file-service.js` | Move/copy/delete filesystem operations, EXDEV handling |
| `media-service.js` | Profile/avatar/banner/album cover copying |
| `dialog-service.js` | Electron file/folder dialogs |

## Phase 4: IPC Registration

**Goal**: Make `main.js` read like app bootstrap, not a long IPC file.

- Move IPC registration into `src/main/ipc/*`.
- Keep channel names and return shapes **compatible**.
- Do **not** rename preload methods unless every caller is updated.

## Phase 5: Preload API

**Goal**: Keep preload small and clearly documented.

- Group preload methods by domain section.
- Optionally move API map into `src/preload/api-map.js`.
- **Never** expose raw IPC.

## Phase 6: Renderer State, DOM, and API

**Goal**: Reduce global state and make dependencies visible.

- Create `src/renderer/state.js`, `dom.js`, `api.js`, utility modules.
- Keep transitional `window.Sonic` or existing globals as needed.
- Move one state group at a time; smoke test between moves.

## Phase 7: Renderer Components

**Goal**: Isolate reusable UI pieces.

- Extract smart selectors, confirm modals, track rows, album cards, and playlist cards.
- Use **safe DOM creation** for dynamic metadata/user text.
- Use `addEventListener` — not inline `onclick`.

## Phase 8: Renderer Views

**Goal**: Each screen owns its render/update logic.

- Extract home, library, playing, settings, and profile views.
- Keep DOM IDs and CSS classes stable.
- View modules should render UI and call services/API wrappers only.

## Phase 9: Player Features

**Goal**: Isolate playback from library rendering.

- Extract audio player, queue, controls, and persistence.
- Preserve shuffle, repeat, history, favorite, queue, and active UI behavior.
- Keep `<audio id="audio-player">` and button IDs unchanged.

## Phase 10: Feature Modules

**Goal**: Move specialized flows out of generic renderer code.

- Extract favorites, history, library manager, metadata editor, and drag/drop ordering.
- Use names that preserve playlist vs album boundaries.

## Phase 11: CSS Refactor

**Goal**: Make styles easier to navigate while preserving visual output.

- Keep `css/style.css` as the only stylesheet linked from `index.html`.
- Split content into imported files using CSS `@import`.
- Do **not** redesign while moving styles.
- Verify player bar, sidebar, modals, library grid, profile page, and now-playing view after each CSS move.

## Phase 12: HTML Cleanup

**Goal**: Make `index.html` structure-focused.

- Remove inline `style` gradually.
- Replace inline event handlers with JS event listeners.
- Keep stable DOM anchors.
- Keep CSP strict.

## High-Risk Areas — Handle Slowly

Handle these slowly and test after each change:

- **Track ID generation and deletion cleanup** — cascades through many tables.
- **`fs:moveFilesToAlbum`** — touches filesystem, track DB, artist DB, album metadata DB, playlist DB, history DB, and covers.
- **`fs:scanMasterDir`** — discovers files, upserts metadata, removes stale records, and returns UI data.
- **Renderer `renderLibrary`** — controls track rows, filters, selection, actions, and drag/drop behavior.
- **Player queue persistence** — interacts with settings and playback UI.
- **Inline `onclick` usage** and any code that expects functions to exist on `window`.

## Function Mapping Reference

### Main Process

| Current item | Target file |
|---|---|
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
|---|---|
| Global state variables | `src/renderer/state.js` |
| DOM selectors | `src/renderer/dom.js` |
| Renderer API calls | `src/renderer/api.js` |
| `generateId` | `src/renderer/utils/ids.js`, then align with shared helper |
| `SmartSelector` | `src/renderer/components/smart-selector.js` |
| `MultiSmartSelector` | `src/renderer/components/multi-smart-selector.js` |
| `showConfirm`, `showConfirmModal` | `src/renderer/components/confirm-modal.js` |
| Track row creation | `src/renderer/components/track-row.js` |
| Album/playlist cards | `src/renderer/components/album-card.js`, `playlist-card.js` |
| `switchView` | `src/renderer/events.js` or `src/renderer/views/router.js` |
| `refreshLibrary`, `renderAlbumsGrid`, `renderLibrary` | `src/renderer/views/library-view.js` |
| `renderHome` | `src/renderer/views/home-view.js` |
| Now-playing screen logic | `src/renderer/views/playing-view.js` |
| Settings and migration UI | `src/renderer/views/settings-view.js` |
| Profile rendering/forms | `src/renderer/views/profile-view.js` |
| `playSong`, `playNext`, `playPrev`, `updatePlayPauseBtn` | `src/renderer/player/*` |
| Queue UI/persistence | `src/renderer/player/queue.js`, `persistence.js` |
| `formatTime` | `src/renderer/utils/format-time.js` |
| DOM escaping/safe creation | `src/renderer/utils/dom-safe.js` |
| Metadata editor modal | `src/renderer/features/metadata-editor.js` |
| Favorites | `src/renderer/features/favorites.js` |
| History | `src/renderer/features/history.js` |
| Library manager flows | `src/renderer/features/library-manager.js` |
| Drag/drop ordering | `src/renderer/features/drag-drop-order.js` |
| `bootApp` | `src/renderer/app.js` |
