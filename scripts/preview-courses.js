#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { generateMap, COURSES, SURVIVAL_TYPES, FINAL_TYPES, hazardTransform } from '../shared/maps.js';

const arg = (name, fallback) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : fallback;
const seed = arg('--seed', 'rumble-atlas');
const out = path.resolve(arg('--out', 'docs/course-atlas.svg'));
const escape = text => String(text).replace(/[&<>\"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const n = value => Number(value).toFixed(2);
const maps = [
  ...COURSES.map((course, i) => generateMap({ seed, round: i, type: 'race', course: course.id })),
  ...SURVIVAL_TYPES.map((variant, i) => generateMap({ seed, round: i + 2, type: 'survival', variant })),
  ...FINAL_TYPES.map((variant, i) => generateMap({ seed, round: i + 5, type: 'final', variant })),
];
const project = ([x, y, z]) => [(x - z) * 0.866, (x + z) * 0.42 - y];
function vertex(shape, x, y, z) {
  const r = shape.rotation || [0, 0, 0];
  [y, z] = [y * Math.cos(r[0]) - z * Math.sin(r[0]), y * Math.sin(r[0]) + z * Math.cos(r[0])];
  [x, z] = [x * Math.cos(r[1]) + z * Math.sin(r[1]), -x * Math.sin(r[1]) + z * Math.cos(r[1])];
  [x, y] = [x * Math.cos(r[2]) - y * Math.sin(r[2]), x * Math.sin(r[2]) + y * Math.cos(r[2])];
  return project([shape.position[0] + x, shape.position[1] + y, shape.position[2] + z]);
}
function meshFaces(shape, edge) {
  const size = shape.size || [shape.radius * 2, shape.radius * 2, shape.radius * 2];
  const h = size[1] / 2;
  const ring = shape.radius && shape.kind !== 'log' ? Array.from({ length: shape.sides || 12 }, (_, i) => {
    const a = i * Math.PI * 2 / (shape.sides || 12);
    return [Math.sin(a) * shape.radius, Math.cos(a) * shape.radius];
  }) : [[-size[0] / 2, -size[2] / 2], [size[0] / 2, -size[2] / 2], [size[0] / 2, size[2] / 2], [-size[0] / 2, size[2] / 2]];
  const faces = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    faces.push({ color: edge, points: [vertex(shape, a[0], -h, a[1]), vertex(shape, b[0], -h, b[1]), vertex(shape, b[0], h, b[1]), vertex(shape, a[0], h, a[1])] });
  }
  faces.push({ color: shape.color, points: ring.map(([x, z]) => vertex(shape, x, h, z)) });
  return faces;
}

let svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1360" height="1630" viewBox="0 0 1360 1630"><rect width="1360" height="1630" fill="#121a35"/><g font-family="Arial,sans-serif">';
svg += '<text x="40" y="50" fill="#ffce55" font-size="13" font-weight="bold" letter-spacing="3">RUMBLE RUN / PROCEDURAL COURSE PACK</text><text x="40" y="100" fill="#ffffff" font-size="42" font-weight="bold">Same friends. Different chaos.</text>';
svg += '<text x="40" y="132" fill="#b8c6e3" font-size="16">8 race families · 5 survival arenas · 3 finals · Seed: ' + escape(seed) + '</text>';
maps.forEach((map, i) => {
  const x = 40 + (i % 4) * 324, y = 165 + Math.floor(i / 4) * 342;
  const shapes = [...map.platforms, ...map.hazards.map(h => {
    const pose = hazardTransform(h, 1.4);
    return { ...h, ...pose, size: h.kind === 'log' ? [h.radius * 5.5, h.radius * 2, h.radius * 2] : h.size };
  })].sort((a, b) => a.position[0] + a.position[2] - b.position[0] - b.position[2]);
  const faces = shapes.flatMap(shape => meshFaces(shape, map.theme.edge));
  const points = faces.flatMap(face => face.points);
  const minX = Math.min(...points.map(p => p[0])), maxX = Math.max(...points.map(p => p[0]));
  const minY = Math.min(...points.map(p => p[1])), maxY = Math.max(...points.map(p => p[1]));
  const scale = Math.min(275 / (maxX - minX), 222 / (maxY - minY));
  const ox = x + 154 - (minX + maxX) / 2 * scale, oy = y + 168 - (minY + maxY) / 2 * scale;
  svg += '<rect x="' + x + '" y="' + y + '" width="308" height="325" rx="18" fill="#202c4a"/>';
  svg += '<text x="' + (x + 18) + '" y="' + (y + 26) + '" fill="' + map.theme.secondary + '" font-size="10" font-weight="bold" letter-spacing="2">' + (map.type === 'final' ? 'THE FINAL' : map.mode === 'survival' ? 'SURVIVAL' : 'RACE') + ' / ' + String(i + 1).padStart(2, '0') + '</text>';
  svg += '<text x="' + (x + 18) + '" y="' + (y + 51) + '" fill="#ffffff" font-size="19" font-weight="bold">' + escape(map.name) + '</text>';
  for (const face of faces) svg += '<polygon points="' + face.points.map(p => n(p[0] * scale + ox) + ',' + n(p[1] * scale + oy)).join(' ') + '" fill="' + face.color + '" stroke="#101932" stroke-width="0.25" stroke-linejoin="round"/>';
  svg += '<text x="' + (x + 18) + '" y="' + (y + 305) + '" fill="#b8c6e3" font-size="11">' + escape(map.theme.name) + ' · ' + (map.mode === 'race' ? map.sections.length + ' sections' : map.platforms.length + ' platforms') + '</text>';
});
svg += '<text x="40" y="1575" fill="#b8c6e3" font-size="13">Layout diagrams from actual generated geometry. New seeds remix routes, colours, obstacle positions and timing.</text><text x="40" y="1600" fill="#8597b9" font-size="12">Human players only · 4–8 rounds · Browser multiplayer · No downloaded textures or character models</text></g></svg>';
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, svg + '\n');
console.log('Wrote ' + out);
