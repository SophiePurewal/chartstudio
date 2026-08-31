# ChartStudio

A Figma plugin for creating polished, editable charts directly on the canvas from structured data.

ChartStudio is designed to make common data-visualisation tasks faster and more consistent inside Figma. Choose a chart type, paste or enter your data, configure labels and styling, preview the result, and insert an editable chart into the current Figma file.

## What ChartStudio does

- Creates **line, bar and doughnut charts** directly in Figma
- Accepts **pasted CSV/TSV data** or manual data entry
- Supports **multiple data series**
- Generates **editable Figma layers**, rather than a flattened image
- Provides a live preview before insertion
- Includes configurable labels, legends, values, grid lines and axis controls
- Supports grouped and stacked bar charts
- Supports smooth or straight line charts, data points and multiple line styles
- Supports doughnut radius, segment borders, percentages and legend positioning
- Includes standard, neutral, data and pattern-fill palettes
- Provides responsive chart-width presets for desktop, tablet and mobile layouts
- Supports custom chart widths from 320px
- Validates data before chart creation and surfaces useful errors and warnings

## Chart types

### Line charts

Create single- or multi-series line charts with controls for:

- line weight
- smooth curves
- data points
- grid visibility
- axis labels and ticks
- Y-axis visibility
- values and legends
- accessible dash patterns for distinguishing multiple series

### Bar charts

Create configurable bar charts with:

- grouped or stacked layouts
- compact, default or wide spacing
- adjustable corner radius
- multiple series
- data labels, legends and axis controls

### Doughnut charts

Create doughnut charts with:

- adjustable inner radius
- optional percentages
- segment borders
- legend positioning
- pattern-fill styling
- validation for negative, zero-total or overly complex datasets

## Responsive chart sizing

ChartStudio includes layout presets aligned to common design-grid widths:

| Preset | Width |
| --- | ---: |
| Desktop — 12 column | 1064px |
| Desktop — 10 column | 872px |
| Desktop — 8 column | 680px |
| Tablet — 12 column | 632px |
| Mobile — 4 column | 351px |
| Custom | 320px+ |

The generated Figma chart adapts its spacing and layout according to the selected width.

## How it works

ChartStudio uses a five-step workflow:

1. **Type** — choose line, bar or doughnut.
2. **Data** — paste CSV/TSV data or enter it manually.
3. **Labels** — configure chart title, axes, values and legend options.
4. **Style** — choose chart-specific styling, palette and output size.
5. **Insert** — review the preview and create the editable chart in Figma.

For pasted data, the first column is treated as the category label and subsequent columns become data series.

Example:

```csv
Month,Revenue,Costs
Jan,12400,8200
Feb,13800,8900
Mar,15200,9400
Apr,14600,9100
```

## Accessibility and visual distinction

ChartStudio does not rely on colour alone for every multi-series visualisation.

The plugin includes:

- distinct line dash patterns for multi-series line charts
- pattern-fill options for doughnut charts
- configurable labels and visible data values
- responsive sizing for smaller layouts
- validation and warnings for chart configurations that may be difficult to interpret

## Tech stack

- **React 19**
- **TypeScript**
- **TanStack Router / TanStack Start**
- **Vite**
- **Tailwind CSS**
- **Radix UI**
- **Lucide React**
- **Figma Plugin API**
- **Bun**

## Local development

### Prerequisites

- [Bun](https://bun.sh/)
- Figma Desktop

### Install dependencies

```bash
bun install
```

### Run the UI in the browser

```bash
bun run dev
```

This starts the browser-based plugin preview for developing and testing the interface.

### Build the Figma plugin

```bash
bun run build:plugin
```

The plugin build creates:

```text
dist/
├── code.js
├── ui.html
└── manifest.json
```

### Load the plugin in Figma

After building:

1. Open **Figma Desktop**.
2. Go to **Plugins → Development → Import plugin from manifest...**
3. Select the repository's `manifest.json`.
4. Run **ChartStudio** from your development plugins.

The root manifest points Figma to the generated files in `dist/`.

## Useful scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Run the browser development preview |
| `bun run build` | Build the web application |
| `bun run build:plugin` | Build the Figma plugin controller and UI |
| `bun run preview` | Preview the production web build |
| `bun run lint` | Run ESLint |
| `bun run format` | Format the project with Prettier |

## Project structure

```text
chartstudio/
├── src/
│   ├── figma/
│   │   ├── code.ts        # Figma plugin controller and chart generation
│   │   ├── types.ts       # Shared plugin message and chart types
│   │   └── ui.tsx         # Plugin UI entry point
│   ├── routes/
│   │   └── index.tsx      # Main ChartStudio interface and preview
│   ├── components/        # Reusable UI components
│   └── lib/               # Chart formatting and pattern utilities
├── scripts/
│   └── build-figma-plugin.mjs
├── manifest.json
├── plugin.html
└── package.json
```

## Development status

ChartStudio is currently configured as a **Figma development plugin**. The repository contains both the browser-based interface preview and the Figma-specific controller used to generate editable chart layers on the canvas.

## Author

Designed and developed by **Sophie Purewal**.
