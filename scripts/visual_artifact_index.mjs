import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_FILE), '..');
const ARTIFACT_DIR = path.join(ROOT, 'artifacts', 'visual-verification');
const TEST_RESULTS_DIR = path.join(ROOT, 'ui', 'test-results');

async function listFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) return listFiles(full);
        return [full];
      })
    );
    return files.flat();
  } catch {
    return [];
  }
}

function rel(file) {
  return path.relative(ROOT, file);
}

async function readJson(file) {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const files = await listFiles(ARTIFACT_DIR);
const assertionFiles = files.filter((file) => file.endsWith('-assertions.json')).sort();
const debugFiles = files.filter((file) => file.endsWith('-debug.json')).sort();
const watermarkFiles = files.filter((file) => file.endsWith('-watermark-proof.json')).sort();

const assertions = [];
for (const file of assertionFiles) {
  const payload = await readJson(file);
  assertions.push({
    file: rel(file),
    profile: payload?.profile ?? null,
    status: payload?.status ?? 'unknown',
    failed_assertions:
      Array.isArray(payload?.assertions)
        ? payload.assertions.filter((item) => item?.status !== 'pass').map((item) => item?.id)
        : [],
  });
}

const resultFiles = await listFiles(TEST_RESULTS_DIR);
const diffImages = resultFiles
  .filter((file) => file.endsWith('-diff.png') || file.endsWith('-actual.png') || file.endsWith('-expected.png'))
  .sort();

const index = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  assertions,
  debug_files: debugFiles.map(rel),
  watermark_proofs: watermarkFiles.map(rel),
  diff_images: diffImages.map(rel),
};

await fs.mkdir(ARTIFACT_DIR, { recursive: true });
await fs.writeFile(path.join(ARTIFACT_DIR, 'index.json'), `${JSON.stringify(index, null, 2)}\n`, 'utf8');

const markdown = [
  '# Visual Artifact Index',
  '',
  `Generated: ${index.generated_at}`,
  '',
  '## Assertion Status',
  ...assertions.map((item) =>
    `- ${item.profile ?? 'unknown'}: ${item.status.toUpperCase()} (${item.file})${
      item.failed_assertions.length ? ` failed=${item.failed_assertions.join(',')}` : ''
    }`
  ),
  '',
  '## Watermark Proofs',
  ...index.watermark_proofs.map((file) => `- ${file}`),
  '',
  '## Debug Files',
  ...index.debug_files.map((file) => `- ${file}`),
  '',
  '## Diff Images',
  ...(index.diff_images.length ? index.diff_images.map((file) => `- ${file}`) : ['- none']),
  '',
];

await fs.writeFile(path.join(ARTIFACT_DIR, 'index.md'), `${markdown.join('\n')}\n`, 'utf8');

console.log(path.join(ARTIFACT_DIR, 'index.json'));
