import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { build } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

await fs.rm(dist, { recursive: true, force: true });

await build({
  root,
  configFile: false,
  publicDir: false,
  build: {
    target: "es2019",
    outDir: dist,
    emptyOutDir: false,
    lib: {
      entry: path.join(root, "src/figma/code.ts"),
      name: "ChartStudioFigmaController",
      formats: ["iife"],
      fileName: () => "code.js",
    },
  },
});

await build({
  root,
  configFile: false,
  publicDir: false,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    target: "es2019",
    outDir: dist,
    emptyOutDir: false,
    rollupOptions: {
      input: path.join(root, "plugin.html"),
    },
  },
});

await inlineUiAssets();
await fs.copyFile(
  path.join(root, "manifest.json"),
  path.join(dist, "manifest.json"),
);

async function inlineUiAssets() {
  const htmlPath = path.join(dist, "plugin.html");
  let html = await fs.readFile(htmlPath, "utf8");

  const scriptMatches = [
    ...html.matchAll(
      /<script type="module" crossorigin src="([^"]+)"><\/script>/g,
    ),
  ];
  for (const match of scriptMatches) {
    const assetPath = path.join(dist, match[1].replace(/^\//, ""));
    const js = await fs.readFile(assetPath, "utf8");
    html = html.replace(match[0], `<script>${js}</script>`);
  }

  const cssMatches = [
    ...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g),
  ];
  for (const match of cssMatches) {
    const assetPath = path.join(dist, match[1].replace(/^\//, ""));
    const css = await fs.readFile(assetPath, "utf8");
    html = html.replace(match[0], `<style>${css}</style>`);
  }

  html = html.replace(
    /<script type="module" src="\/src\/figma\/ui.tsx"><\/script>/,
    "",
  );
  await fs.writeFile(path.join(dist, "ui.html"), html);
  await fs.rm(path.join(dist, "plugin.html"), { force: true });
  await fs.rm(path.join(dist, "assets"), { recursive: true, force: true });
}
