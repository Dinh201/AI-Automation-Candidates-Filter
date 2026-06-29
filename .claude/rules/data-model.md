# Data Model & Constants

## Valid DB Table Names

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

Always validate against this allowlist before any `db:set` or `db:remove` operation.

## ID Formats & Prefixes

| Prefix | Entity | Example |
|---|---|---|
| `trk_` | Track | `trk_abc123` |
| `art_` | Artist | `art_xyz789` |
| `alb_` | Album (ID3 metadata) | `alb_def456` |
| `pl_` | Playlist (user-created) | `pl_ghi012` |
| `usr_` | User | `usr_default` |
| `tag_` | Tag | `tag_jkl345` |

## Special IDs

- **Default user**: `usr_default`
- **Root album**: `alb_root`

## Shared Constants (Phase 1 targets)

These go into `src/shared/constants.js`:

```js
const DEFAULT_USER_ID = 'usr_default';
const ROOT_ALBUM_ID = 'alb_root';
const UNKNOWN_ARTIST = 'Unknown Artist';
const SUPPORTED_AUDIO_EXTENSIONS = ['.mp3'];
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
```

## Rules

- Do **not** change the hash algorithm or output format of ID helpers unless a migration is planned and tested.
- Do **not** use literal strings for DB tables, IPC channels, path segments, statuses, or setting keys — use named constants.
- When adding a new field, renderer code must have **fallback behavior** for old records that lack the field.
- When deleting a track, synchronize: `favorite`, `history`, `playlist.tracks`, and `orders`.

## DB Persistence Rules

- Format JSON with **2 spaces**.
- Save only **affected tables**.
- Use a helper such as `saveTables(state, ['artist', 'album', 'track'])` when saving multiple tables.
- Prefer **atomic JSON writes** once the DB layer is stable.
- Do **not** change the DB schema without fallback/migration.
- Do **not** manually edit DB files unless the task explicitly requires it.
- Do **not** commit private user data or real music metadata if this repo is shared.
