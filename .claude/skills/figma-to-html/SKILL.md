---
name: figma-to-html
description: Convert Figma REST API data into responsive semantic HTML, tokenized CSS, exported assets, and vanilla JavaScript.
allowed-tools: Bash, Read, Write
---

# Figma to HTML/CSS/JS Skill

Use this skill for the implementation phase after `design-brief.md` exists.

## Inputs
Read in order:
1. `.env` for `FIGMA_TOKEN` and optional `FIGMA_FILE_KEY`.
2. `.claude/rules/figma-workflow.md`.
3. `.claude/rules/html-css-js.md`.
4. `design-brief.md`.

Never print or write the token.

## Implementation Principles
- Build responsive, design-faithful UI rather than fixed pixel-perfect desktop
  copies.
- Use semantic HTML and BEM-style classes.
- Use CSS custom properties for all design values.
- Use flex/grid, stable aspect ratios, and mobile-first breakpoints.
- Export only true Figma media/artwork image nodes through the REST API.
- Rebuild header, footer, nav, text, cards, buttons, forms, and layout frames as
  HTML/CSS, even if Figma can render them as one image.
- Add hover, focus-visible, active, and mobile states where relevant.
- Use vanilla JavaScript only for real interactions.

## Build Steps
1. Create `src/css/tokens.css` from the brief token tables.
2. Create `src/css/reset.css`.
3. Create `src/index.html` section by section.
4. Export images from Figma to `assets/images/`.
5. Create `src/css/main.css` section by section.
6. Create `src/js/main.js` for required interactions.
7. Run the `code-quality` skill and fix all issues.

## Token Rules
- Colors: `--color-*`
- Font families: `--font-family-*`
- Font sizes: `--font-size-*`
- Font weights: `--font-weight-*`
- Line heights: `--line-height-*`
- Letter spacing: `--letter-spacing-*`
- Spacing: `--spacing-*`
- Radius: `--radius-*`
- Shadows/effects: `--shadow-*`
- Containers/layout: `--container-*`
- Motion: `--duration-*`, `--ease-*`

Implementation CSS should reference tokens with `var(...)`. If a required token
is missing, add it to `tokens.css` first.

## Image Export
For true media/artwork image nodes listed in the brief:
1. Request `GET /v1/images/{fileKey}?ids={nodeIds}&format=webp&scale=2`.
2. Download each returned URL to `assets/images/{suggested-filename}.webp`.
3. Reference images from `src/index.html` with relative paths.
4. Preserve aspect ratio and crop intent with CSS.

Do not export whole UI sections as images. If a header, footer, nav, card, or
text block appears image-like in the first Figma crawl, inspect the child nodes
and recreate the visible UI in code.

## Final Check
- No framework/library usage.
- No inline styles or inline event handlers.
- No raw colors in `main.css`.
- No broken image paths.
- No header, footer, nav, text block, card grid, or form is implemented as one
  screenshot image.
- No horizontal scroll at 375px, 768px, or 1280px.
- Interactions are keyboard-accessible.
