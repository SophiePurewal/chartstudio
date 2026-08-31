import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

const requiredFiles = [
  { name: "code.js", minBytes: 1_000 },
  { name: "ui.html", minBytes: 1_000 },
  { name: "manifest.json", minBytes: 50 },
];

for (const file of requiredFiles) {
  const filePath = path.join(dist, file.name);
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    fail(`Missing required plugin artifact: dist/${file.name}`);
  }

  if (!stat.isFile() || stat.size < file.minBytes) {
    fail(
      `Invalid plugin artifact: dist/${file.name} is smaller than ${file.minBytes} bytes`,
    );
  }
}

const manifest = JSON.parse(
  await fs.readFile(path.join(dist, "manifest.json"), "utf8"),
);

if (manifest.name !== "ChartStudio") {
  fail(`Unexpected plugin name: ${manifest.name ?? "<missing>"}`);
}

if (manifest.main !== "code.js" || manifest.ui !== "ui.html") {
  fail(
    `dist/manifest.json must reference code.js and ui.html; got main=${manifest.main}, ui=${manifest.ui}`,
  );
}

if (!Array.isArray(manifest.editorType) || !manifest.editorType.includes("figma")) {
  fail("dist/manifest.json must declare Figma as an editor type");
}

const allowedDomains = manifest.networkAccess?.allowedDomains;
if (
  !Array.isArray(allowedDomains) ||
  allowedDomains.length !== 1 ||
  allowedDomains[0] !== "none"
) {
  fail(
    'dist/manifest.json must explicitly disable external network access with allowedDomains: ["none"]',
  );
}

const html = await fs.readFile(path.join(dist, "ui.html"), "utf8");

const forbiddenUiReferences = [
  /src=["']\/assets\//i,
  /href=["']\/assets\//i,
  /src=["']\/src\//i,
  /href=["']\/src\//i,
];

for (const pattern of forbiddenUiReferences) {
  if (pattern.test(html)) {
    fail(
      `dist/ui.html contains a non-inlined runtime asset reference matching ${pattern}`,
    );
  }
}

if (!html.includes("<style>") || !html.includes("<script")) {
  fail("dist/ui.html does not appear to contain inlined CSS and JavaScript");
}

console.log("ChartStudio plugin artifact verified.");

function fail(message) {
  console.error(`Plugin verification failed: ${message}`);
  process.exit(1);
}
