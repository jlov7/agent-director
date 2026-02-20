#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const ALLOWED_CSS_FILES = new Set([
  'styles/main.css',
  'styles/tokens.css',
  'styles/layout.css',
  'styles/components.css',
]);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);
const RHYTHM_PX_SCALE = new Set(['0', '4', '6', '8', '10', '12', '14', '16', '20', '24', '32', '44']);

const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(abs);
      continue;
    }
    const rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    const ext = path.extname(entry.name);
    if (ext === '.css' && !ALLOWED_CSS_FILES.has(rel)) {
      violations.push(`${rel}: CSS outside canonical token stylesheet`);
      continue;
    }
    if (!CODE_EXT.has(ext)) continue;
    const text = fs.readFileSync(abs, 'utf8');

    const normalized = text.replace(/maskColor\s*=\s*["'][^"']+["']/g, '');
    if (/(#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\()/.test(normalized)) {
      violations.push(`${rel}: hard-coded color literal in code file`);
    }
    if (/style=\{\{[^}]*\b(color|background|borderColor)\b/i.test(text)) {
      violations.push(`${rel}: inline style color property detected`);
    }
  }
}

walk(ROOT);

function lintTypographyHierarchy() {
  const componentsPath = path.resolve(ROOT, 'styles/components.css');
  if (!fs.existsSync(componentsPath)) return;
  const text = fs.readFileSync(componentsPath, 'utf8');
  const fontSizes = [...text.matchAll(/font-size:\s*([^;]+);/g)].map((match) => match[1].trim());
  const invalid = fontSizes.filter((value) => !/^var\(--ux-tier-[1-4]\)$/.test(value));
  if (invalid.length > 0) {
    violations.push(`styles/components.css: font-size must use ux typography tiers (found: ${invalid.slice(0, 3).join(', ')})`);
  }
}

function lintSpacingRhythm() {
  const files = ['styles/layout.css', 'styles/components.css'];
  const spacingRule = /(margin(?:-[a-z]+)?|padding(?:-[a-z]+)?|gap|row-gap|column-gap)\s*:\s*([^;]+);/g;

  for (const file of files) {
    const abs = path.resolve(ROOT, file);
    if (!fs.existsSync(abs)) continue;
    const text = fs.readFileSync(abs, 'utf8');
    for (const match of text.matchAll(spacingRule)) {
      const value = match[2];
      if (value.includes('var(')) continue;
      const pxValues = [...value.matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((item) => item[1]);
      if (pxValues.length === 0) continue;
      const invalid = pxValues.find((px) => !RHYTHM_PX_SCALE.has(px));
      if (invalid) {
        violations.push(`${file}: spacing value ${invalid}px is outside rhythm scale`);
      }
    }
  }
}

function lintHeavyTreatmentRule() {
  const componentsPath = path.resolve(ROOT, 'styles/components.css');
  if (!fs.existsSync(componentsPath)) return;
  const text = fs.readFileSync(componentsPath, 'utf8');
  const selectors = ['.route-outcome-card', '.route-state-card', '.journey-action-card', '.route-progress-strip'];
  for (const selector of selectors) {
    const blockMatch = text.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([\\s\\S]*?)\\}`, 'm'));
    if (!blockMatch) continue;
    const block = blockMatch[1];
    const heavyCount = [...block.matchAll(/\b(background|box-shadow|backdrop-filter)\s*:/g)].length;
    if (heavyCount > 1) {
      violations.push(`styles/components.css: ${selector} violates heavy-treatment rule (${heavyCount} heavy properties)`);
    }
  }
}

lintTypographyHierarchy();
lintSpacingRhythm();
lintHeavyTreatmentRule();

if (violations.length > 0) {
  console.error('Design lint failed:\n');
  for (const item of violations) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Design lint passed: token-driven style constraints satisfied.');
