# Project Overview

`ElectronApp` is a desktop music player named **Sonic**, built with Electron. The app manages a local music library, reads `.mp3` files, extracts ID3 metadata, lets users create playlists/folders, and stores local app data in JSON files under `db/`.

The app is **local-first and offline-friendly**. Every change must protect the user's music files, media files, and local JSON data. Do not delete, move, overwrite, or migrate user data unless the user explicitly requests it or the existing UI flow clearly requires it.

## Tech Stack

- **Desktop runtime**: Electron
- **Language**: JavaScript CommonJS, HTML, CSS
- **UI**: Vanilla DOM API, no frontend framework
- **Styling**: Plain CSS in `css/style.css`, with CSS variables in `:root`
- **IPC**: `ipcMain.handle(...)` in main process; `ipcRenderer.invoke(...)` exposed only through `preload.js`
- **Data store**: JSON files in `db/`, read/written with `fs/promises`
- **Music metadata**:
  - `node-id3` for reading/updating ID3 tags
  - `music-metadata` for reading duration
- **Package manager**: npm
- **Current script**: `npm start`

The project currently has **no test runner, linter, formatter, build script, or bundler**. Add tooling only when it is part of a controlled refactor phase.

## Current Directory Structure

```text
ElectronApp/
  CLAUDE.md
  Refractor.md
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

## Current Architecture Summary

- `main.js`: Electron main process, window creation, IPC handlers, JSON DB persistence, filesystem operations, library scanning, media asset handling, and music metadata work.
- `preload.js`: Secure context bridge exposing `window.electronAPI`.
- `index.html`: Single-page UI structure, view markup, modal markup, inline SVG/icons, and renderer script loading.
- `css/style.css`: Application styles, global tokens, layout, components, and view-specific styles in one large stylesheet.
- `js/renderer.js`: Renderer state, DOM rendering, player controls, library/profile/settings views, modals, drag/drop, history, favorites, and app boot logic.
- `db/`: Local JSON data store.
- `media/` and `music/`: Local assets and music files.

## Target Structure (from Refractor.md)

Keep root entrypoints stable during refactor: `main.js`, `preload.js`, `index.html`, `css/style.css`.

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
  style.css        ← import entrypoint only
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

## Suggested Workflow For New Tasks

1. Read `package.json`, relevant source files, `CLAUDE.md`, `Refractor.md`, and git status.
2. Identify whether the change belongs in main, preload, renderer, CSS, DB, or multiple layers.
3. Check whether the work belongs to a refactor phase.
4. Preserve compatibility rules before changing names, paths, schemas, IDs, IPC, DOM IDs, or CSS classes.
5. If adding IPC, update main, preload, renderer, and `CLAUDE.md` if the API becomes permanent.
6. If changing data, check compatibility with existing DB records.
7. If changing UI, verify related DOM selectors and CSS classes.
8. Run the appropriate smoke/regression checks.
9. Report changed files, tests run, and remaining risks.
