# Coding Standards

## General JavaScript

- Use `const` by default; use `let` only when reassignment is required.
- Prefer small, **named functions** over long inline callbacks.
- Prefer **early returns** over deep nesting.
- Keep one module focused on **one responsibility**.
- Export a **small public API** from each module.
- Keep side effects visible in function names.
- Split functions that grow beyond roughly **80–120 lines**.
- Do **not** repeat literal strings for DB tables, IPC channels, path segments, statuses, or setting keys — use constants.
- Do **not** mix UI rendering, persistence, filesystem work, and playback behavior in the same function.

## Error Handling

- Do **not** use empty `catch` blocks for important operations.
- IPC handlers must return a stable error object:

```js
return { success: false, error: error.message };
```

- Log unexpected main-process failures with useful context.
- Do **not** expose long stack traces in renderer UI.

## DOM Safety

- Render user input, DB text, and music metadata through **`textContent`** — never `innerHTML`.
- Use `createElement` for dynamic rows/cards.
- Use `addEventListener` — do **not** use inline `onclick`.
- If `innerHTML` is used for static SVG/icon markup, keep **dynamic text outside it**.
- Do **not** use `innerHTML +=` in loops.
- Use controlled **event delegation** with `data-*` attributes for rendered lists.

## IPC and Validation

- Renderer code must only call `window.electronAPI`.
- Main process must validate before filesystem or DB operations:
  - DB category is in the allowlist.
  - Path/file exists when required.
  - File extension is supported.
  - Names remain valid after sanitization.
  - File operations do not accidentally target unrelated user paths.

## Filesystem

- Use `path` APIs (`path.join`, `path.basename`, `path.extname`) for all path operations.
- Use **one shared helper** for path-to-file-URL conversion.
- Convert Windows backslashes to forward slashes in local file URLs.
- Handle **filename collisions** before moving/copying files.
- Handle **`EXDEV` moves** with copy + unlink.
- Use clear error handling for multi-file move/delete/migrate flows.
- Do **not** delete user files as part of a pure refactor.

## DB and Persistence

- Save only **affected tables**.
- Use a helper such as `saveTables(state, ['artist', 'album', 'track'])` when saving multiple tables.
- Prefer **atomic JSON writes** once the DB layer is stable.
- Add **fallback logic** for old records when adding fields.
- When deleting a track, synchronize `favorite`, `history`, `playlist.tracks`, and `orders`.
- Do **not** change DB schema without fallback/migration.

## UI/UX

- Keep the existing app style stable during refactor.
- Use **CSS classes** instead of inline styles.
- **Destructive modals** must require confirmation.
- Provide loading/error/empty states for:
  - Library scan
  - File move
  - Migration
  - Profile save
  - Settings actions
- Avoid **blocking the UI** for long library scans; add progress state when refactoring that area.
