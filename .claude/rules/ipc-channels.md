# IPC Channels

All IPC must flow through three layers:

1. `ipcMain.handle(...)` in the **main process**.
2. A **wrapper** in `preload.js`.
3. A **renderer call** through `window.electronAPI`.

Never call or expose raw `ipcRenderer` from renderer code.

## Existing Channel Registry

### DB

| Channel | Description |
|---|---|
| `db:getAll` | Get all records from a table |
| `db:set` | Set/upsert a record in a table |
| `db:remove` | Remove a record from a table |

### App

| Channel | Description |
|---|---|
| `app:toggleDevTools` | Toggle Electron DevTools |

### Filesystem / Library / Media

| Channel | Description |
|---|---|
| `fs:getMasterDir` | Get the master music directory path |
| `fs:setMasterDir` | Set the master music directory path |
| `fs:migrateMasterDir` | Migrate music library to a new directory |
| `fs:createAlbum` | Create a playlist folder (kept for compatibility) |
| `fs:moveFilesToAlbum` | Move tracks to a playlist folder (kept for compatibility) |
| `fs:renameAlbum` | Rename a playlist folder (kept for compatibility) |
| `fs:deleteAlbum` | Delete a playlist folder (kept for compatibility) |
| `fs:deleteFiles` | Delete music files |
| `fs:changeAlbumCover` | Change the cover image for a playlist/album |
| `fs:changeProfileAvatar` | Change user profile avatar |
| `fs:changeProfileBanner` | Change user profile banner |
| `fs:scanMasterDir` | Scan master directory and upsert library metadata |

### Dialogs

| Channel | Description |
|---|---|
| `dialog:pickFolder` | Open a folder picker dialog |
| `dialog:pickMultipleFiles` | Open a multi-file picker dialog |

### Music

| Channel | Description |
|---|---|
| `music:updateTags` | Read and update ID3 tags on a track |

## Rules For Adding New IPC

- Channel names use format `domain:action` (e.g., `fs:createAlbum`).
- IPC handlers must return a stable shape:

```js
// Success
return { success: true, data: result };

// Error
return { success: false, error: error.message };
```

- Main process must validate inputs before filesystem or DB operations:
  - DB category is in the allowlist.
  - Path/file exists when required.
  - File extension is supported.
  - Names remain valid after sanitization.
  - File operations do not accidentally target unrelated user paths.

- Do **not** change existing channel names until all callers are migrated.
- Do **not** rename preload methods unless every caller is updated.
- After adding a new IPC, update this document if the API becomes permanent.

## Target IPC Module Split (Phase 4)

```text
src/main/ipc/
  index.js        ← registers all handlers
  db-ipc.js       ← db:getAll, db:set, db:remove
  app-ipc.js      ← app:toggleDevTools
  fs-ipc.js       ← all fs:* channels
  dialog-ipc.js   ← dialog:pickFolder, dialog:pickMultipleFiles
  music-ipc.js    ← music:updateTags
```
