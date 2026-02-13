# Splicetable

A visual tool for splitting images into customizable grid and scatter layouts. Upload any image, tweak the cells with intuitive knob controls, and export polished compositions as high-resolution PNGs.

## Features

### Layout Modes
- **Stretch** — Uniform grid with adjustable column/row proportions (drag crosshairs to resize)
- **Scatter** — Freely positioned cells with chaos, width/height, and aspect ratio controls

### Content Modes
- **Image** — Each cell shows a portion of the source image (Fill or Fit)
- **Color** — Each cell displays the dominant color extracted from that region

### Canvas Controls
- **Ratio** — Original, 1:1, 4:5, 16:9, 9:16, 4:3, 3:4
- **Background** — Transparent, solid color (with suggested swatches from the image), or custom background image
- **Scale** — 0–400% canvas zoom

### Cell Controls
- **Count** — 4 to 256 cells
- **Size** — Scale cells from 0% to 200%
- **Spread** — Push cells apart or pull them together (-400% to +400%)
- **Tumble** — Random rotation per cell (0–100%)
- **Radius** — Corner rounding from sharp to full pill (0–100%)

### Export
- PNG export at 1x, 1.5x, 2x, or 4x resolution (base size 2000px)

### Other
- Dark and light theme (follows system preference, manual toggle available)
- Pan and scroll navigation on the canvas
- Interactive cell selection and resizing in Scatter mode

## Getting Started

Splicetable is a static web app — no build step required. Just serve the files.

### Local development

You can open `index.html` directly in a browser, or use any static file server:

```bash
# Python
python3 -m http.server 8000

# Node (npx)
npx serve .
```

Then open `http://localhost:8000` in your browser.

### Deploy to Quick (Shopify internal)

```bash
npm install -g @shopify/quick
quick deploy . splicetable
```

Hosted at `splicetable.quick.shopify.io`.

## Project Structure

```
Splicetable/
├── index.html              # Main app entry point (React components inline)
├── script.js               # Core engine (ImageGridSplitter class)
├── style.css               # App-level styles
├── components/             # Design system components
│   ├── Button.jsx / .css
│   ├── Control.jsx / .css
│   ├── Divider.jsx / .css
│   ├── ImageReplacer.jsx / .css
│   ├── Knob.jsx / .css
│   ├── Navbar.jsx / .css
│   ├── SectionTitle.jsx / .css
│   ├── SegmentedControl.jsx / .css
│   ├── Select.jsx / .css
│   ├── Slider.jsx / .css
│   └── TextField.jsx / .css
├── Icons/                  # SVG icons
├── Fonts/                  # Alpha Lyrae typeface
├── Examples/               # Sample images for the home screen
├── design-system.html      # Component showcase / documentation
├── design-system.css
├── tester.html             # Component testing page
└── tester.css
```

## Dependencies

All loaded via CDN — no `npm install` needed:

- [React 18](https://react.dev/) — UI components
- [Babel Standalone](https://babeljs.io/) — In-browser JSX transformation
- [interact.js](https://interactjs.io/) — Drag, resize, and gesture handling

## Font

[Alpha Lyrae Medium](https://www.fontfabric.com/fonts/alpha-lyrae/) by Fontfabric, licensed under the [SIL Open Font License 1.1](Fonts/alpha-lyrae-master/LICENSE.md).
