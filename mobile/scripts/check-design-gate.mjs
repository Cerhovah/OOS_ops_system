import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const manifestPath = path.resolve(scriptDir, '../../docs/design/p5-visual-v2.gate.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const stageIndex = process.argv.indexOf('--stage');
const stage = stageIndex >= 0 ? process.argv[stageIndex + 1] : 'implementation';

if (stage === 'status') {
  console.log(`P5 Visual v2: ${manifest.status}`);
  console.log(`Figma page: ${manifest.figma.sourcePageId ?? 'pending'}`);
  for (const [name, approved] of Object.entries(manifest.approvals)) {
    console.log(`${approved ? 'ready' : 'pending'}: ${name}`);
  }
  process.exit(0);
}

if (!['implementation', 'release'].includes(stage)) {
  console.error(`Unknown design gate stage: ${stage}`);
  process.exit(2);
}

const missing = [];
if (manifest.status !== 'approved') missing.push('manifest status=approved');
if (!manifest.approvals.referenceRoles) missing.push('reference role approval');
if (!manifest.approvals.figmaHighFidelity) missing.push('high-fidelity Figma approval');
if (!manifest.approvals.claudeReadOnlyVisualReview) missing.push('Claude read-only visual review');
if (!manifest.approvals.userFigmaApproval) missing.push('user Figma approval');
if (!manifest.figma.sourcePageId) missing.push('P5 Visual v2 page id');

for (const [name, nodeId] of Object.entries(manifest.figma.coreFrames)) {
  if (!nodeId) missing.push(`core frame: ${name}`);
}

if (stage === 'release' && !manifest.approvals.deviceComparison) {
  missing.push('approved Figma ↔ device comparison');
}

if (missing.length > 0) {
  console.error(`P5 Visual v2 ${stage} gate is blocked:`);
  for (const item of missing) console.error(`- ${item}`);
  process.exit(1);
}

console.log(`P5 Visual v2 ${stage} gate passed.`);
