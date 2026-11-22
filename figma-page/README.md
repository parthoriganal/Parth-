# Token Sheet — generated from Parth's Figma team library

A single-page, zero-dependency site that renders the published styles of
[Parth Gosra's team library](https://www.figma.com/design/jVyB81kl0gZUrm5oc0GPIn)
(`jVyB81kl0gZUrm5oc0GPIn`) as a living, copy-ready design-token sheet.

```bash
npm run figma        # → http://localhost:5190
npm run figma:build  # → dist/figma-page/
```

## What was read from the file

Values were decoded from the Figma REST document tree — not sampled from a
screenshot — so they are exact.

### Published FILL styles

| Figma style | Hex | Node | Where it's used on the page |
|---|---|---|---|
| `Fuschia/100` | `#EF5DA8` | `91:0` | checklist ticks, fuschia CTA, hero bloom |
| `Fuschia/80`  | `#F178B6` | `91:1` | hover states |
| `Fuschia/60`  | `#FCDDEC` | `91:2` | badge fill, hero wash |
| `Iris/100`    | `#5D5FEF` | `91:3` | primary button, live dot, score meter |
| `Iris/80`     | `#7879F1` | `91:4` | primary button hover |
| `Iris/60`     | `#A5A6F6` | `91:5` | badge fill, meter track, hero wash |

### Published TEXT styles

| Figma style | Family | Size | Weight | Leading | Tracking | Node |
|---|---|---|---|---|---|---|
| `Header 1` | Work Sans | 34px | 700 | 100% | −0.68px | `116:2` |
| `Header 2` | Work Sans | 20px | 700 | 100% | −0.4px  | `116:3` |
| `Body`     | Work Sans | 13px | 400 | 100% | −0.26px | `116:4` |

### Surfaces

`#E5E5E5` page canvas · `#FAFAFA` card · `#D8D8D8` unset swatch ·
`#007BE5` the accent link colour used in the file's `02` card.

## Files

| File | Purpose |
|---|---|
| `index.html` | Structure — hero, palette, type, live UI demo |
| `style.css` | Every colour/type value as a CSS custom property |
| `tokens.json` | Machine-readable tokens, with Figma style names and node IDs |
| `app.js` | Renders swatches + specimens from `tokens.json`, computes WCAG contrast, handles copy/download |

## Features

- **Copy on click** — any swatch copies its hex; each type row copies its font shorthand.
- **Live WCAG contrast** — every swatch shows its best ratio against white or ink and flags anything under 4.5:1.
- **CSS export** — one button copies the whole palette and type scale as `:root` variables.
- **`tokens.json` download** — the same data the page renders from.
- **Responsive** — single column under 720px; respects `prefers-reduced-motion`; printable.

## Notes

- The page's own UI chrome (display headline, mono labels) intentionally uses
  Inter/JetBrains Mono; all *content* styling uses only the published Work Sans
  styles. Nothing on the page introduces a colour that isn't in the library.
- The Figma image CDN isn't reachable from this sandbox, so the two raster
  images embedded in the source file (card `01`/`02` photos) are not reproduced.
  Everything else is rebuilt from the document tree.
