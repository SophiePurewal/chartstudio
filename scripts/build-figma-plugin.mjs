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
    // Figma Desktop's plugin controller runtime can reject newer syntax such as
    // call/object spread before any plugin code runs. Keep the controller bundle
    // conservative so startup succeeds even when chart code uses modern TS.
    target: "es2015",
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
const rootManifest = await readAndValidateRootManifest();
await writeDistManifest(rootManifest);

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
    html = html.replace(
      match[0],
      () => `<script type="module">${escapeInlineScript(js)}</script>`,
    );
  }

  const cssMatches = [
    ...html.matchAll(/<link rel="stylesheet" crossorigin href="([^"]+)">/g),
  ];
  for (const match of cssMatches) {
    const assetPath = path.join(dist, match[1].replace(/^\//, ""));
    const css = await fs.readFile(assetPath, "utf8");
    html = html.replace(
      match[0],
      () => `<style>${escapeInlineStyle(css)}</style>`,
    );
  }

  html = html.replace(
    /<script type="module" src="\/src\/figma\/ui.tsx"><\/script>/,
    "",
  );
  await fs.writeFile(path.join(dist, "ui.html"), html);
  await fs.rm(path.join(dist, "plugin.html"), { force: true });
  await fs.rm(path.join(dist, "assets"), { recursive: true, force: true });
}

async function readAndValidateRootManifest() {
  const manifestPath = path.join(root, "manifest.json");
  const rawManifest = await fs.readFile(manifestPath, "utf8");
  let manifest;

  try {
    manifest = JSON.parse(rawManifest);
  } catch (error) {
    throw new Error(
      `Invalid plugin manifest JSON at ${manifestPath}: ${error.message}`,
    );
  }

  if (!manifest || typeof manifest !== "object") {
    throw new Error(
      `Invalid plugin manifest at ${manifestPath}: expected a JSON object`,
    );
  }

  if (manifest.main !== "dist/code.js" || manifest.ui !== "dist/ui.html") {
    throw new Error(
      `Root manifest must point to dist outputs (main: dist/code.js, ui: dist/ui.html). Found main: ${manifest.main}, ui: ${manifest.ui}`,
    );
  }

  return manifest;
}

async function writeDistManifest(manifest) {
  const distManifestPath = path.join(dist, "manifest.json");
  const temporaryManifestPath = `${distManifestPath}.tmp`;
  const distManifest = {
    ...manifest,
    main: "code.js",
    ui: "ui.html",
  };

  const serializedDistManifest = `${JSON.stringify(distManifest, null, 2)}\n`;

  await fs.writeFile(temporaryManifestPath, serializedDistManifest, "utf8");
  JSON.parse(await fs.readFile(temporaryManifestPath, "utf8"));
  await fs.rename(temporaryManifestPath, distManifestPath);
}

function escapeInlineScript(source) {
  return source
    .replace(/<\/script/gi, () => "<" + "\\/" + "script")
    .replace(/<!--/g, () => "<" + "\\!--");
}

function escapeInlineStyle(source) {
  return source.replace(/<\/style/gi, () => "<" + "\\/" + "style");
}
