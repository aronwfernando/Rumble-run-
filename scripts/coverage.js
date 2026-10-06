#!/usr/bin/env node
import fs from 'node:fs';
const source = fs.readFileSync('docs/specification.md', 'utf8').split('\n');
const previous = fs.existsSync('docs/coverage.json') ? JSON.parse(fs.readFileSync('docs/coverage.json', 'utf8')) : [];
const overrides = new Map(previous.map(row => [row.id, row]));
const rows = []; let appendix = false, section = '', family = '', count = 0, paragraphCount=0,inCode=false,collecting=true;
const plain = text => text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*`]/g, '').trim();
source.forEach((line, index) => {
  if(line.startsWith('```')){inCode=!inCode;return;}
  if(inCode)return;
  if(line.startsWith('## END IMPLEMENTATION'))collecting=false;
  if (line.startsWith('## Appendix A')) {appendix = true;collecting=true;section='';}
  if(!collecting)return;
  const heading = appendix ? line.match(/^\*\*(\d+)\. (.+?)\*\*/) : line.match(/^### (\d+)\. (.+)/);
  if (heading) { section = (appendix ? 'A' : 'S') + heading[1].padStart(2, '0'); family = plain(heading[2]); count = 0;paragraphCount=0; }
  if (!section || (!appendix && Number(section.slice(1)) > 21)) return;
  let label = '', behaviour = '',paragraph=false;
  if (line.startsWith('- ') || (!appendix && /^\d+\. /.test(line))) {
    label = plain(line.replace(/^(?:- |\d+\. )/, '')); behaviour = label;
  } else if (line.startsWith('|') && !/^\|\s*:?[-]+/.test(line) && !source[index + 1]?.startsWith('|---') && !source[index + 1]?.startsWith('| ---')) {
    const cells = line.split('|').slice(1, -1).map(plain); label = cells[0]; behaviour = cells.slice(1).join(' · ');
  }else if(!appendix&&!line.startsWith('#')&&!line.startsWith('|')&&line.trim().length>60){label=plain(line);behaviour=label;paragraph=true;}
  if (!label) return;
  const id = `${section}-${paragraph?'P'+String(++paragraphCount).padStart(3,'0'):String(++count).padStart(3, '0')}`;
  const expansion = /abilit|equipment|special|social|progression|currenc|cosmeti|club|editor|creative|platform|customisation/i.test(family);
  const integration = /voice chat|premium|real.money|adverts|account linking|in-app purchases|Show-Bucks|Gems|split-screen|console|Nintendo|Epic account|Scopely account/i.test(label);
  const row = { id, referenceFamily: family, referenceLabel: label, behaviour, sourceLine: index + 1,
    path: '', status: integration ? 'blocked' : 'missing', dependency: integration ? 'External provider, durable storage, credentials or supported hardware' : 'Shared gameplay and authoritative rules',
    phase: expansion ? (/abilit|equipment|special/i.test(family) ? 'P4' : 'P3') : 'P2',
    acceptance: 'Integrated playable behaviour, authoritative validation, reset rules, UI and regression evidence.',
    evidence: integration ? 'Not enabled; no external-service integration is claimed.' : 'Not implemented yet.' };
  rows.push({ ...row, ...overrides.get(id), sourceLine: index + 1 });
});
fs.writeFileSync('docs/coverage.json', JSON.stringify(rows, null, 2) + '\n');
const escape = text => String(text).replaceAll('|', '/').replaceAll('\n', ' ');
const table = rows.map(r => `| ${r.id} | ${escape(r.referenceLabel)} | ${r.status} | ${r.phase} | ${escape(r.path || '—')} | ${escape(r.dependency)} | ${escape(r.acceptance)} | ${escape(r.evidence)} |`).join('\n');
fs.writeFileSync('docs/COVERAGE.md', '# Requirement coverage\n\nThe source labels are preserved from the supplied specification. Status describes Rumble Run, not current commercial-game availability. Detailed behaviour and source lines are in `coverage.json`. Missing, partial and blocked rows are remaining work, not shipped features.\n\n| ID | Reference requirement | Status | Phase | Implementation | Dependency | Acceptance check | Evidence |\n|---|---|---|---|---|---|---|---|\n' + table + '\n');
console.log(JSON.stringify({ requirements: rows.length, appendix: rows.filter(r => r.id.startsWith('A')).length,
  statuses: Object.fromEntries(['complete', 'partial', 'missing', 'broken', 'blocked'].map(s => [s, rows.filter(r => r.status === s).length])) }));
