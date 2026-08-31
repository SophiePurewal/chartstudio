# Contributing to ChartStudio

Thanks for improving ChartStudio.

## Development setup

1. Install Bun.
2. Run `bun install`.
3. Run `bun run dev` for the browser-based plugin preview.
4. Run `bun run build:plugin` before loading the development plugin in Figma.

## Quality gate

Before opening a pull request, run:

```bash
bun run check
```

This verifies formatting, TypeScript, linting, unit tests, the web build, the Figma plugin build, and the generated plugin artifact.

## Pull requests

Keep changes focused and explain the product or technical reason for the change. UI changes should include a screenshot or recording where practical. Changes to chart output should be tested with representative line, bar, and doughnut data.

Do not commit credentials, API keys, local environment files, or user data.
