import {
  DOUGHNUT_PATTERN_TYPES,
  type DoughnutPatternType,
  getDoughnutPatternType,
} from "./doughnut-patterns";

export type DoughnutPatternSvgSegment = {
  value: number;
  label: string;
};

export function getPatternTypeForIndex(index: number): DoughnutPatternType {
  return getDoughnutPatternType(index);
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

function patternMarks(pattern: DoughnutPatternType, size: number): string {
  const dark = "#281805";
  const lines: string[] = [];
  const dots: string[] = [];
  const step = pattern === "dot-condensed" ? 8 : 12;

  if (pattern === "solid") return "";

  for (let x = -size; x <= size * 2; x += step) {
    if (pattern === "hatch" || pattern === "cross-hatch") {
      lines.push(
        `<line x1="${x}" y1="${size}" x2="${x + size}" y2="0" stroke="${dark}" stroke-width="1.75" stroke-linecap="butt" />`,
      );
    }
    if (pattern === "hatch-reverse" || pattern === "cross-hatch") {
      lines.push(
        `<line x1="${x}" y1="0" x2="${x + size}" y2="${size}" stroke="${dark}" stroke-width="1.75" stroke-linecap="butt" />`,
      );
    }
    if (pattern === "grid") {
      lines.push(
        `<line x1="${x}" y1="0" x2="${x}" y2="${size}" stroke="${dark}" stroke-width="1.4" stroke-linecap="butt" />`,
      );
      lines.push(
        `<line x1="0" y1="${x + size}" x2="${size}" y2="${x + size}" stroke="${dark}" stroke-width="1.4" stroke-linecap="butt" />`,
      );
    }
  }

  if (pattern === "dot" || pattern === "dot-condensed") {
    const spacing = pattern === "dot-condensed" ? 8 : 14;
    const radius = pattern === "dot-condensed" ? 1.5 : 1.8;
    for (let y = 0; y <= size; y += spacing) {
      for (let x = 0; x <= size; x += spacing) {
        dots.push(
          `<circle cx="${x}" cy="${y}" r="${radius}" fill="${dark}" />`,
        );
      }
    }
  }

  return [...lines, ...dots].join("\n");
}

export function getPatternPreviewStyle(
  patternType: DoughnutPatternType,
): string {
  return patternMarks(patternType, 12);
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

  const defs: string[] = [];
  const segmentUses: string[] = [];

  segments.forEach((segment, index) => {
    const start = (acc / total) * Math.PI * 2 - Math.PI / 2;
    acc += Math.max(0, segment.value);
    const end = (acc / total) * Math.PI * 2 - Math.PI / 2;
    const patternType = getPatternTypeForIndex(index);
    const path = arcPath(
      outerRadius,
      outerRadius,
      outerRadius,
      innerRadius,
      start,
      end,
    );
    const clipId = `${defPrefix}-clip-${index}`;
    const maskId = `${defPrefix}-mask-${index}`;
    const segmentId = `${defPrefix}-slice-${index}`;

    defs.push(`
      <clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><path d="${path}" /></clipPath>
      <mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" fill="black" />
        <path d="${path}" fill="white" />
      </mask>
      <g id="${segmentId}">
        <g mask="url(#${maskId})" clip-path="url(#${clipId})">
          <path d="${path}" fill="#E6E3DC" />
          <g>${patternMarks(patternType, size)}</g>
        </g>
        ${segmentBorders ? `<path d="${path}" fill="none" stroke="#FFFFFF" stroke-width="2" />` : ""}
      </g>
    `);
    segmentUses.push(`<use href="#${segmentId}" />`);
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>${defs.join("\n")}</defs>
    ${segmentUses.join("\n")}
    <circle cx="${outerRadius}" cy="${outerRadius}" r="${innerRadius}" fill="#FFFFFF" />
  </svg>`;
}

export function createPatternLegendSwatchSvg(
  patternIndex: number,
  size = 12,
): string {
  const patternType = getPatternTypeForIndex(patternIndex);
  const marks = getPatternPreviewStyle(patternType);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect x="0" y="0" width="${size}" height="${size}" rx="2" fill="#E6E3DC" />
    <g clip-path="url(#clip)">${marks}</g>
    <clipPath id="clip"><rect x="0" y="0" width="${size}" height="${size}" rx="2" /></clipPath>
  </svg>`;
}

export { DOUGHNUT_PATTERN_TYPES };
