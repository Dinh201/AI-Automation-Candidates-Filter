---
name: code-quality
description: Review and auto-fix the generated HTML/CSS/JS for correctness, accessibility, responsiveness, and project rule compliance.
allowed-tools: Read, Write, Bash
---

# Code Quality Review Skill

Review:
- `src/index.html`
- `src/css/reset.css`
- `src/css/tokens.css`
- `src/css/main.css`
- `src/js/main.js`
- `assets/images/`

## HTML Checks
- Semantic structure with one `h1`.
- Logical heading order.
- Meaningful `alt` text for content images and empty `alt` for decorative images.
- Buttons for actions, links for navigation.
- Stylesheet order: reset, tokens, main.
- Script loaded with `defer`.
- No inline styles or inline event handlers.

## CSS Checks
- Tokens define all design values used repeatedly.
- `main.css` uses tokens for color, type, spacing, radius, shadows, transitions,
  and layout values.
- Mobile-first CSS with tablet and desktop breakpoints.
- Flex/grid layout instead of fixed desktop-only positioning.
- Hover, focus-visible, active, and reduced-motion states.
- No unnecessary `!important`.
- No horizontal overflow at common viewport widths.

## JavaScript Checks
- `const`/`let` only.
- `DOMContentLoaded` wrapper.
- `addEventListener` only.
- ARIA state is updated for dynamic controls.
- No console debugging output.
- No external libraries.

## Accessibility Checks
- Keyboard access for every interactive element.
- Visible focus styles.
- Contrast is acceptable for body text and UI controls.
- Interactive controls have names.
- Content remains readable if JavaScript fails.

## Output
1. List each issue with file and line number.
2. Fix every issue immediately.
3. Summarize what was fixed and what risk remains.
