# Domain Boundaries: Album vs Playlist

**Album** and **Playlist** are two fundamentally different concepts and must remain separate at all times.

## Definitions

| Concept | Description | Storage |
|---|---|---|
| **Playlist** | A user-created list/collection. Can be linked to a physical folder via `playlist.folderName`. | `db/playlist.json` |
| **Album** | Metadata from a track — usually the ID3 `album` tag. Referenced by `track.albumId`. | `db/album.json` |

## Mandatory Rules

- Code that manages **user-created lists/folders** belongs to playlist/folder modules.
- Code that reads or edits **ID3 album metadata** belongs to metadata/album modules.
- Do **not** use playlist title as album metadata.
- Do **not** use ID3 album as the source of truth for user-created playlists.
- Do **not** name a new internal function `createAlbum`, `moveFilesToAlbum`, or `deleteAlbum` when it actually manages user-created playlists/folders. Keep old public IPC names only for backward compatibility.

## Correct Language

Use these terms to clearly distinguish concepts:

| For user-created playlists/folders | For ID3 album metadata |
|---|---|
| `playlist` | `metadataAlbum` |
| `playlistFolder` | `id3Album` |
| `folderName` | `albumId` |
| `collection` | `albumTag` |

## Backward Compatibility Exception

Existing public IPC names **must stay unchanged** until all callers are migrated through an explicit compatibility plan:

- `fs:createAlbum`
- `fs:moveFilesToAlbum`
- `fs:renameAlbum`
- `fs:deleteAlbum`

Internally, route those handlers to correctly named playlist/folder or album metadata services:

```js
// Keep public IPC name for compatibility.
ipcMain.handle('fs:createAlbum', (event, playlistTitle) => {
  return playlistService.createPlaylistFolder(playlistTitle);
});
```

## Module Ownership Table

| Module | Owns |
|---|---|
| `src/main/playlist-service.js` | User-created playlists, folderName, playlist-track association |
| `src/main/album-metadata-service.js` | ID3 album records in `album.json` |
| `src/renderer/components/playlist-card.js` | Rendering user-created playlists |
| `src/renderer/components/album-card.js` | Rendering ID3 album metadata cards |

## Anti-Patterns To Avoid

```js
// BAD: using album terminology for a user playlist operation
function createAlbum(title) { ... }

// GOOD: clear domain naming
function createPlaylistFolder(title) { ... }

// BAD: treating ID3 album as playlist
playlist.title = track.id3Album;

// GOOD: keep them separate
metadataAlbum.name = track.id3Album;
playlist.title = userProvidedTitle;
```
