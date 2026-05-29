# File-Specific Rules

Rules for each key file in the project.

---

## `main.js`

**Purpose**: Electron bootstrap, lifecycle wiring, and temporary home for main-process code until split.

**Rules**:

- Must **not** contain UI rendering logic.
- Must **not** use DOM APIs.
- Every IPC handler must return a compatible object: `{ success: true, ... }` or `{ success: false, error }`.
- Validate IPC input before filesystem operations.
- Validate DB category with the allowlist before read/write.
- Avoid empty `catch` blocks for DB, filesystem, metadata, and IPC operations.
- Use `path.join`, `path.basename`, `path.extname`, and shared path helpers instead of manual string manipulation.
- Handle `EXDEV` for cross-device moves.
- Keep existing IPC channels stable while moving implementation behind them.

**Target split**:

```text
src/main/app-window.js
src/main/app-state.js
src/main/db-store.js
src/main/metadata-service.js
src/main/library-scan-service.js
src/main/playlist-service.js
src/main/album-metadata-service.js
src/main/file-service.js
src/main/media-service.js
src/main/dialog-service.js
src/main/ipc/*
```

---

## `preload.js`

**Purpose**: Security boundary between renderer and main process.

**Rules**:

- Do **not** expose raw `ipcRenderer`.
- Do **not** expose Node.js or Electron APIs directly.
- API names should be clear verbs.
- Use **object input** when an API needs two or more arguments.
- Keep raw IPC channel names **hidden** from renderer code.
- Group APIs by domain when editing:
  - `master directory`
  - `dialogs`
  - `library/playlist`
  - `media/profile`
  - `app/dev`
  - `music metadata`
  - `DB`

**Optional future target**: `src/preload/api-map.js`

---

## `js/renderer.js`

**Purpose**: Current renderer boot file and temporary compatibility layer during refactor.

**Rules**:

- Do **not** use Node.js APIs.
- Do **not** import `fs`, `path`, or `electron`.
- Do **not** manipulate files directly from renderer code.
- Limit global mutable state.
- Keep existing globals only as a **transitional compatibility layer**.
- Use `window.electronAPI` for all main-process calls.
- Do **not** use `innerHTML` with dynamic user input, DB text, or music metadata.
- Prefer `document.createElement`, `textContent`, `classList`, `dataset`, and `addEventListener`.
- Do **not** add new inline `onclick` handlers.
- Each render function should own **one UI region**.
- Avoid mixing UI rendering, DB mutation, and playback behavior in one function.

**Temporary safe pattern for migrating globals**:

```js
window.Sonic = window.Sonic || {};
window.Sonic.formatTime = function formatTime(seconds) {
  // ...
};
```

**Target split**:

```text
src/renderer/state.js
src/renderer/dom.js
src/renderer/api.js
src/renderer/events.js
src/renderer/utils/*
src/renderer/components/*
src/renderer/player/*
src/renderer/views/*
src/renderer/features/*
```

---

## `index.html`

**Purpose**: App structure, stable DOM anchors, views, and modal containers.

**Rules**:

- Do **not** add inline scripts.
- Do **not** add inline event handlers.
- Limit inline `style`; move styling into CSS classes.
- Any element accessed from JS should keep a **stable `id`**.
- Keep CSP strict.
- Do **not** remove a DOM node unless every JS reference is updated.
- Keep UI language consistent.

---

## `css/style.css`

**Purpose**: Current single stylesheet and future import entrypoint.

**Rules**:

- Use CSS variables in `:root` for repeated colors, radius, fonts, and spacing.
- Avoid adding unrelated hard-coded colors when an existing token fits.
- Name classes by component/function.
- Avoid broad selectors that can unexpectedly affect the whole app.
- Group styles with short comments.
- Search `index.html` and renderer files before removing or renaming classes.
- Do **not** redesign while splitting CSS.
- Keep class names stable during the first CSS split.

**Safe future approach — `css/style.css` becomes only an import entrypoint**:

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

---

## `db/*.json`

**Purpose**: Local app data.

**Rules**:

- Format JSON with **2 spaces**.
- Do **not** manually edit DB files unless the task requires it.
- Do **not** commit private user data or real music metadata if this repo is shared.
- If a schema migration is needed, write clear migration code and preserve backward compatibility.
- When adding a new field, renderer code must have **fallback behavior** for old records.
- Save only affected tables.
- Prefer **atomic writes** after the DB layer is stable.

---

## `media/` and `music/`

**Purpose**: User/local assets and music library.

**Rules**:

- Do **not** delete, rename, compress, move, or overwrite media/music files unless explicitly requested.
- Do **not** commit large music files to a shared source repo.
- When creating or changing covers/avatar/banner assets, update the related DB/path references.

---

## `package.json`

**Rules**:

- Add scripts deliberately: `lint`, `format`, `format:check`, `test`, `start`.
- Keep runtime dependencies and dev dependencies separate.
- Do **not** update major package versions unless the app is tested afterward.
- After dependency changes, run `npm install` so `package-lock.json` stays synchronized.
