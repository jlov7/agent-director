#!/usr/bin/env node
/* global console, process */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd(), 'src');
const ALLOWED_CSS_FILES = new Set(['styles/main.css']);
const CODE_EXT = new Set(['.ts', '.tsx', '.js', '.jsx']);

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

if (violations.length > 0) {
  console.error('Design lint failed:\n');
  for (const item of violations) console.error(`- ${item}`);
  process.exit(1);
}

console.log('Design lint passed: token-driven style constraints satisfied.');
