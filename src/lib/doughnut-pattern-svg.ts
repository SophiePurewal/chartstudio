import { getDoughnutPatternType } from "./doughnut-patterns";

export type DoughnutPatternSvgSegment = {
  value: number;
  label: string;
};

export function createPatternDefs(defPrefix: string): string {
  const id = (name: string) => `${defPrefix}-${name}`;
  return `
  <defs>
    <pattern id="${id("solid")}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#E6E3DC" />
    </pattern>
    <pattern id="${id("hatch")}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#E6E3DC" />
      <path d="M0,8 L8,0" stroke="#281805" stroke-width="1" />
    </pattern>
    <pattern id="${id("hatch-reverse")}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#E6E3DC" />
      <path d="M0,0 L8,8" stroke="#281805" stroke-width="1" />
    </pattern>
    <pattern id="${id("dot")}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#E6E3DC" />
      <circle cx="4" cy="4" r="1.2" fill="#281805" />
    </pattern>
    <pattern id="${id("cross-hatch")}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#E6E3DC" />
      <path d="M0,8 L8,0 M0,0 L8,8" stroke="#281805" stroke-width="1" />
    </pattern>
    <pattern id="${id("grid")}" patternUnits="userSpaceOnUse" width="8" height="8">
      <rect width="8" height="8" fill="#E6E3DC" />
      <path d="M0,0 H8 M0,4 H8 M0,8 H8 M0,0 V8 M4,0 V8 M8,0 V8" stroke="#281805" stroke-width="0.75" />
    </pattern>
    <pattern id="${id("dot-condensed")}" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="#E6E3DC" />
      <circle cx="1.5" cy="1.5" r="0.8" fill="#281805" />
      <circle cx="4.5" cy="4.5" r="0.8" fill="#281805" />
    </pattern>
  </defs>`;
}

function arcPath(
  cx: number,
  cy: number,
  r: number,
  ir: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const x0 = cx + Math.cos(start) * r;
  const y0 = cy + Math.sin(start) * r;
  const x1 = cx + Math.cos(end) * r;
  const y1 = cy + Math.sin(end) * r;
  const ix1 = cx + Math.cos(end) * ir;
  const iy1 = cy + Math.sin(end) * ir;
  const ix0 = cx + Math.cos(start) * ir;
  const iy0 = cy + Math.sin(start) * ir;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${large} 0 ${ix0} ${iy0} Z`;
}

export function createPatternedDoughnutSvg(opts: {
  size: number;
  innerRadiusRatio: number;
  segments: DoughnutPatternSvgSegment[];
  segmentBorders: boolean;
  defPrefix: string;
}): string {
  const { size, innerRadiusRatio, segments, segmentBorders, defPrefix } = opts;
  const outerRadius = size / 2;
  const innerRadius = outerRadius * innerRadiusRatio;
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0) || 1;
  let acc = 0;
  const defs = createPatternDefs(defPrefix);
  const paths = segments
    .map((segment, index) => {
      const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
      acc += Math.max(0, segment.value);
      const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
      const patternType = getDoughnutPatternType(index);
      return `<path d="${arcPath(outerRadius, outerRadius, outerRadius, innerRadius, start, end)}" fill="url(#${defPrefix}-${patternType})" ${segmentBorders ? 'stroke="#FFFFFF" stroke-width="2"' : ""} />`;
    })
    .join("\n");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${defs}
    ${paths}
    <circle cx="${outerRadius}" cy="${outerRadius}" r="${innerRadius}" fill="#FFFFFF" />
  </svg>`;
}

export function createPatternLegendSwatchSvg(
  patternIndex: number,
  size = 12,
): string {
  const patternType = getDoughnutPatternType(patternIndex);
  const prefix = `legend-${patternIndex}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${createPatternDefs(prefix)}
    <rect x="0" y="0" width="${size}" height="${size}" rx="2" fill="url(#${prefix}-${patternType})" />
  </svg>`;
}
