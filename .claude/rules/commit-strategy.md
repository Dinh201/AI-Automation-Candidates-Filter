# Commit Strategy & Definition of Done

## Commit Strategy

Use **small commits by phase**. Each commit should be atomic and focused on a single refactor step.

### Good Commit Examples

```
refactor: add shared constants and id helpers
refactor: move json db persistence into db-store
refactor: split main ipc handlers by domain
refactor: extract renderer player queue module
refactor: split library view rendering
refactor: move smart selectors into components
refactor: split css into component files
```

### Avoid Mixing in One Commit

- Refactor + redesign
- Refactor + DB schema migration
- Refactor + dependency upgrade
- Refactor + feature changes

## Definition of Done for the Full Refactor

The refactor is complete when **all** of the following are true:

- [ ] `main.js` is only app bootstrap/lifecycle wiring.
- [ ] `preload.js` only exposes a clear API map.
- [ ] `renderer.js` is removed or reduced to a tiny compatibility bootstrap.
- [ ] Main process logic is split into DB, filesystem, metadata, playlist, album metadata, media, dialog, and IPC modules.
- [ ] Renderer logic is split into state, DOM/API wrappers, views, components, player, and feature modules.
- [ ] CSS is split into tokens/base/layout/components/views.
- [ ] Inline styles and inline event handlers are substantially reduced.
- [ ] Dynamic metadata/user text is rendered safely.
- [ ] Album and playlist concepts are consistently separated in code names and data flow.
- [ ] Manual regression checklist passes (see `regression-checklist.md`).
- [ ] Lint/format/test scripts exist, or there is a documented reason they are not added yet.

## Suggested Tooling (Add After Phase 1–2)

Add tooling only after Phase 1 or Phase 2, when behavior is stable.

**Recommended packages**:

- ESLint for JavaScript correctness.
- Prettier for formatting.
- Optional simple tests using Node's built-in test runner.

**Suggested `package.json` scripts**:

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

**Initial test targets**:

- `generateId`
- `sanitizeFolderName`
- path-to-file-URL helper
- DB category validation
- playlist vs album metadata helper behavior
