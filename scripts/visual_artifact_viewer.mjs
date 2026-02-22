#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const artifactDir = path.join(root, 'artifacts', 'visual-verification');
const indexPath = path.join(artifactDir, 'index.json');
const outPath = path.join(artifactDir, 'viewer.html');

if (!fs.existsSync(indexPath)) {
  console.error(`Missing artifact index: ${indexPath}`);
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const entries = Array.isArray(payload.assertions) ? payload.assertions : [];
const diffs = Array.isArray(payload.diff_images) ? payload.diff_images : [];

const rowHtml = entries
  .map((entry) => {
    const status = String(entry.status || '').toUpperCase();
    const cls = status === 'PASS' ? 'pass' : 'fail';
    return `<tr><td>${entry.profile}</td><td class="${cls}">${status}</td><td><code>${entry.path}</code></td></tr>`;
  })
  .join('\n');

const diffHtml = diffs.length
  ? diffs.map((p) => `<li><code>${p}</code></li>`).join('\n')
  : '<li>none</li>';

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Visual Artifact Viewer</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; margin: 24px; background:#0b0f14; color:#e6edf3; }
    h1,h2 { margin: 0 0 12px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0 20px; }
    th, td { border: 1px solid #2a3442; padding: 8px 10px; text-align: left; }
    .pass { color: #7bd389; font-weight: 700; }
    .fail { color: #ff8a8a; font-weight: 700; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.92em; }
  </style>
</head>
<body>
  <h1>Visual Artifact Viewer</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <h2>Assertion Status</h2>
  <table>
    <thead><tr><th>Profile</th><th>Status</th><th>Artifact</th></tr></thead>
    <tbody>
      ${rowHtml || '<tr><td colspan="3">No assertion entries</td></tr>'}
    </tbody>
  </table>
  <h2>Diff Images</h2>
  <ul>${diffHtml}</ul>
</body>
</html>`;

fs.mkdirSync(artifactDir, { recursive: true });
fs.writeFileSync(outPath, html, 'utf8');
console.log(outPath);
